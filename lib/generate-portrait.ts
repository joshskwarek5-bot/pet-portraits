import { replicate } from './replicate';

const buildPrompt = (petName: string) =>
  `Transform this pet photo into a hand-drawn pencil and ink sketch portrait. ` +
  `Style: loose expressive pencil linework with slightly wobbly, imperfect strokes, like a skilled illustrator sketched it quickly but confidently. ` +
  `Fine detail in the fur, eyes full of life and personality. ` +
  `Minimal light watercolor or ink wash for warmth — mostly pencil. ` +
  `Pure white background, no shadows or gradients behind the subject. ` +
  `The pet should fill most of the frame, centered, looking slightly toward the viewer. ` +
  `At the very bottom center, write the name "${petName}" in a casual hand-lettered cursive script as if the artist signed it. ` +
  `Do not add any other text, borders, or decorative elements. High quality illustration.`;

/**
 * Generates a portrait from a reference photo URL using Replicate.
 * Returns a base64 data URI so downstream code never needs to make
 * an authenticated request to view or embed the image.
 */
export async function generatePortrait(photoUrl: string, petName: string): Promise<string> {
  console.log(`[generate-portrait] Starting for pet="${petName}"`);

  const output = await replicate.run(
    'black-forest-labs/flux-kontext-pro' as `${string}/${string}`,
    {
      input: {
        prompt: buildPrompt(petName),
        input_image: photoUrl,
        output_format: 'png',
        safety_tolerance: 6,
      },
    }
  );

  // In replicate client v1.x, model outputs are FileOutput objects.
  // Extract the URL string however the object exposes it.
  let outputUrl: string;
  if (Array.isArray(output)) {
    const item = output[0];
    outputUrl = typeof item === 'object' && item !== null && 'url' in item
      ? String((item as { url: () => string }).url())
      : String(item);
  } else if (typeof output === 'object' && output !== null && 'url' in output) {
    outputUrl = String((output as { url: () => string }).url());
  } else {
    outputUrl = String(output);
  }

  console.log(`[generate-portrait] Raw output URL: ${outputUrl}`);

  // Download the image with auth (Replicate output URLs require the API token).
  const imageRes = await fetch(outputUrl, {
    headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
  });

  if (!imageRes.ok) {
    throw new Error(`Failed to download portrait from Replicate: ${imageRes.status}`);
  }

  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  // Write to /tmp for easy dev preview
  try {
    const fs = await import('fs');
    const tmpPath = `/tmp/portrait-${petName.replace(/\s+/g, '-')}.png`;
    fs.writeFileSync(tmpPath, imageBuffer);
    console.log(`[generate-portrait] ✅ Preview: open ${tmpPath}`);
  } catch {
    // Non-critical — ignore in environments where /tmp isn't writable
  }

  console.log(`[generate-portrait] Done — ${imageBuffer.length} bytes`);
  return dataUri;
}
