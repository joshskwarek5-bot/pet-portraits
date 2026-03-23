import { NextRequest, NextResponse } from 'next/server';
import { replicate } from '@/lib/replicate';
import { generatePortrait } from '@/lib/generate-portrait';
import { createPortraitPdf } from '@/lib/create-portrait-pdf';
import { resend } from '@/lib/resend';

// GET /api/test-pipeline?email=you@example.com&petName=Buddy
// Runs the full pipeline with a sample dog photo and emails the result.
// Dev only — remove or protect before going to production.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const petName = searchParams.get('petName') ?? 'Buddy';

  if (!email) {
    return NextResponse.json({ error: 'Pass ?email=you@example.com in the URL' }, { status: 400 });
  }

  // Upload a sample golden retriever photo to Replicate so we have a real file URL
  const samplePhotoUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/YellowLabradorLooking_new.jpg/1200px-YellowLabradorLooking_new.jpg';
  const photoRes = await fetch(samplePhotoUrl);
  const photoBlob = await photoRes.blob();
  const file = await replicate.files.create(photoBlob, { filename: 'test-dog.jpg' });
  const photoUrl = (file as { urls: { get: string } }).urls.get;

  console.log(`[test-pipeline] Generating portrait for "${petName}" → ${email}`);
  const portraitDataUri = await generatePortrait(photoUrl, petName);

  console.log('[test-pipeline] Building PDF');
  const pdfBuffer = await createPortraitPdf(portraitDataUri, petName);

  console.log(`[test-pipeline] Sending email to ${email}`);
  const emailResult = await resend.emails.send({
    from: 'Perfectly Imperfect <portraits@petsdrawings.xyz>',
    to: email,
    subject: `[TEST] Your portrait of ${petName} is ready! 🐾`,
    html: `
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
        </div>
        <p style="font-size:13px;color:#8b7a6a;line-height:1.6;margin:0 0 24px;">
          Not happy with it? Just reply and we'll make it right.
        </p>
        <p style="font-size:14px;font-weight:700;color:#2a2016;margin:0;">— The Perfectly Imperfect Team 🐾</p>
      </div>
    `,
    attachments: [
      {
        filename: `${petName}-portrait.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  });

  console.log('[test-pipeline] Resend response:', JSON.stringify(emailResult));

  return NextResponse.json({ success: true, message: `Email sent to ${email}`, resend: emailResult });
}
