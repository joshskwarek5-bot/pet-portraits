import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend';
import { createPortraitPdf } from '@/lib/create-portrait-pdf';

/**
 * POST /api/send-email
 * Body: { email: string, petName: string, portraitUrl: string }
 *
 * Downloads the portrait, generates a PDF, and emails it to the customer.
 * The webhook handles this automatically — this route is for testing and manual retries.
 */
export async function POST(req: NextRequest) {
  const { email, petName, portraitUrl } = await req.json();

  if (!email || !petName || !portraitUrl) {
    return NextResponse.json(
      { error: 'Missing required fields: email, petName, portraitUrl' },
      { status: 400 }
    );
  }

  try {
    console.log(`[send-email] Building PDF for "${petName}"`);
    const pdfBuffer = await createPortraitPdf(portraitUrl, petName);

    console.log(`[send-email] Sending to ${email}`);
    const result = await resend.emails.send({
      from: 'Perfectly Imperfect <onboarding@resend.dev>',
      to: email,
      subject: `Your portrait of ${petName} is ready! 🐾`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#faf6ee;color:#2a2016;">
          <h1 style="font-size:32px;margin:0 0 8px;">Your portrait is ready! 🎨</h1>
          <p style="font-size:16px;color:#7a6a5a;line-height:1.65;margin:0 0 24px;">
            We've individually crafted a custom hand-drawn style portrait of
            <strong>${petName}</strong>. It's attached as a print-ready PDF!
          </p>
          <img src="${portraitUrl}" alt="Portrait of ${petName}"
            style="width:100%;border-radius:8px;border:3px solid #2a2016;display:block;margin-bottom:24px;" />
          <div style="background:#f0eade;border:2px solid #2a2016;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <strong>✅ Our guaranteed next day delivery — kept.</strong>
          </div>
          <p style="font-size:13px;color:#8b7a6a;">
            Not happy? Just reply and we'll make it right.
          </p>
          <p style="font-weight:700;color:#2a2016;">— The Perfectly Imperfect Team 🐾</p>
        </div>
      `,
      attachments: [
        {
          filename: `${petName}-portrait.pdf`,
          content: pdfBuffer.toString('base64'),
        },
      ],
    });

    console.log(`[send-email] Sent — id=${(result as { id?: string }).id ?? 'unknown'}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[send-email] Error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
