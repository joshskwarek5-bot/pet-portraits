import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { replicate } from '@/lib/replicate';

export async function POST(req: NextRequest) {
  // Accept both 'photo' (legacy) and 'photoBase64' field names
  const body = await req.json();
  const petName: string = body.petName;
  const email: string = body.email;
  const photoBase64: string = body.photoBase64 ?? body.photo;

  console.log(`[create-checkout] Request — pet="${petName}" email="${email}" hasPhoto=${!!photoBase64}`);

  if (!petName || !email || !photoBase64) {
    return NextResponse.json({ error: 'Missing required fields: petName, email, photoBase64' }, { status: 400 });
  }

  // Upload the pet photo to Replicate file storage.
  // Stripe metadata values are capped at 500 characters — far too small for a base64 image —
  // so we store just the file URL in metadata and Replicate handles the binary.
  let photoUrl: string;
  try {
    console.log('[create-checkout] Uploading photo to Replicate file storage');
    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const file = await replicate.files.create(buffer, { filename: `${petName}-photo.jpg` });
    photoUrl = (file as { urls: { get: string } }).urls.get;
    console.log(`[create-checkout] Photo uploaded — URL: ${photoUrl}`);
  } catch (err) {
    console.error('[create-checkout] Photo upload failed:', err);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 1400,
            product_data: {
              name: `Custom Pet Portrait - ${petName}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        petName,
        email,
        photoUrl,
      },
      success_url: `${baseUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: baseUrl,
    });

    console.log(`[create-checkout] Stripe session created — id=${session.id}`);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout] Stripe session creation failed:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
