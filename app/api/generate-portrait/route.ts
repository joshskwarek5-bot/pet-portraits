import { NextRequest, NextResponse } from 'next/server';
import { generatePortrait } from '@/lib/generate-portrait';

/**
 * POST /api/generate-portrait
 * Body: { photoUrl: string, petName: string }
 *
 * Standalone endpoint for triggering portrait generation.
 * The webhook calls generatePortrait() directly — this route exists
 * for testing and potential future use (e.g. previews, retries).
 */
export async function POST(req: NextRequest) {
  const { photoUrl, petName } = await req.json();

  if (!photoUrl || !petName) {
    return NextResponse.json(
      { error: 'Missing required fields: photoUrl, petName' },
      { status: 400 }
    );
  }

  try {
    const portraitUrl = await generatePortrait(photoUrl, petName);
    return NextResponse.json({ portraitUrl });
  } catch (err) {
    console.error('[generate-portrait] Error:', err);
    return NextResponse.json({ error: 'Portrait generation failed' }, { status: 500 });
  }
}
