import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { resend } from '@/lib/resend';
import { generatePortrait } from '@/lib/generate-portrait';
import { createPortraitPdf } from '@/lib/create-portrait-pdf';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    console.error('[webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  console.log(`[webhook] Event received — type=${event.type} id=${event.id}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { petName, email, photoUrl } = session.metadata ?? {};

    console.log(`[webhook] Payment confirmed — pet="${petName}" email="${email}" hasPhotoUrl=${!!photoUrl}`);

    if (!petName || !email || !photoUrl) {
      // Data issue — returning 200 so Stripe doesn't retry endlessly.
      // Flag for manual review.
      console.error('[webhook] Missing metadata fields — cannot process order', {
        petName, email, hasPhotoUrl: !!photoUrl,
      });
      return NextResponse.json({ received: true, warning: 'Missing metadata — flagged for manual review' });
    }

    try {
      // Step 1: Generate portrait
      console.log(`[webhook] Step 1 — generating portrait for "${petName}"`);
      const portraitUrl = await generatePortrait(photoUrl, petName);

      // Step 2: Build PDF
      console.log(`[webhook] Step 2 — building PDF for "${petName}"`);
      const pdfBuffer = await createPortraitPdf(portraitUrl, petName);

      // Step 3: Email the portrait to the customer
      console.log(`[webhook] Step 3 — emailing portrait to ${email}`);
      await resend.emails.send({
        from: 'Perfectly Imperfect <onboarding@resend.dev>',
        to: email,
        subject: `Your portrait of ${petName} is ready! 🐾`,
        html: buildEmailHtml(petName, email),
        attachments: [
          {
            filename: `${petName}-portrait.pdf`,
            content: pdfBuffer.toString('base64'),
          },
        ],
      });

      console.log(`[webhook] Pipeline complete — portrait delivered to ${email}`);
    } catch (err) {
      // Log the failure but still return 200.
      // Stripe will retry on 5xx — we don't want that since the payment already succeeded
      // and a retry would generate a duplicate portrait. Flag for manual follow-up instead.
      console.error(`[webhook] Pipeline failed for "${petName}" (${email}):`, err);
      console.error('[webhook] *** MANUAL REVIEW REQUIRED — order was paid but portrait was not delivered ***');
      return NextResponse.json({
        received: true,
        error: 'Portrait pipeline failed — flagged for manual review',
      });
    }
  }

  return NextResponse.json({ received: true });
}

function buildEmailHtml(petName: string, email: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#faf6ee;color:#2a2016;">
      <h1 style="font-size:32px;margin:0 0 8px;">Your portrait is ready! 🎨</h1>
      <p style="font-size:16px;color:#7a6a5a;line-height:1.65;margin:0 0 24px;">
        We've individually crafted a custom hand-drawn style portrait of
        <strong>${petName}</strong>. Open the attached PDF to see it — it's print-ready!
      </p>

      <div style="background:#f0eade;border:2px solid #2a2016;border-radius:8px;padding:20px 24px;margin-bottom:24px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">🐾</div>
        <strong style="font-size:18px;display:block;margin-bottom:4px;">${petName}'s Portrait</strong>
        <p style="font-size:13px;color:#8b7a6a;margin:0;">Attached as a print-ready PDF</p>
      </div>

      <div style="background:#2a2016;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <strong style="font-size:15px;color:#faf6ee;">✅ Our guaranteed next day delivery — kept.</strong>
        <p style="font-size:13px;color:#c4b59a;margin:4px 0 0;">
          Sent to <strong>${email}</strong> within 24 hours of your order. Every time, no exceptions.
        </p>
      </div>

      <p style="font-size:13px;color:#8b7a6a;line-height:1.6;margin:0 0 24px;">
        Not happy with it? Just reply to this email and we'll make it right. Your satisfaction is guaranteed.
      </p>

      <p style="font-size:14px;font-weight:700;color:#2a2016;margin:0;">
        — The Perfectly Imperfect Team 🐾
      </p>
    </div>
  `;
}
