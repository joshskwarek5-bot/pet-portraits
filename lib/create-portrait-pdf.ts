import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Letter size in PDF points (72 pts = 1 inch)
const PAGE_WIDTH = 612;   // 8.5 in
const PAGE_HEIGHT = 792;  // 11 in
const MARGIN = 72;        // 1 in margins

/**
 * Downloads a portrait image and creates a print-ready letter-size PDF with
 * the image centered and the pet's name beneath it.
 *
 * @param portraitUrl - Public URL of the generated portrait (PNG or JPEG).
 * @param petName     - Displayed below the portrait.
 * @returns PDF as a Buffer, ready to attach to an email.
 */
export async function createPortraitPdf(portraitUrl: string, petName: string): Promise<Buffer> {
  console.log(`[create-portrait-pdf] Building PDF for "${petName}"`);

  // portraitUrl is now always a data URI (data:image/png;base64,...) so no fetch needed.
  let imageBytes: ArrayBuffer;
  let contentType: string;

  if (portraitUrl.startsWith('data:')) {
    const [meta, b64] = portraitUrl.split(',');
    contentType = meta.split(':')[1].split(';')[0];
    imageBytes = Buffer.from(b64, 'base64').buffer as ArrayBuffer;
  } else {
    // Fallback for plain URLs (e.g. manual calls via /api/send-email)
    const res = await fetch(portraitUrl, {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Failed to download portrait: ${res.status}`);
    imageBytes = await res.arrayBuffer();
    contentType = res.headers.get('content-type') ?? '';
  }

  console.log(`[create-portrait-pdf] Image content-type: ${contentType}`);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Embed image — pdf-lib supports PNG and JPEG natively.
  // Replicate outputs are requested as PNG (output_format: 'png') so this is the default path.
  let image;
  if (contentType.includes('png') || portraitUrl.toLowerCase().includes('.png')) {
    image = await pdfDoc.embedPng(imageBytes);
  } else if (
    contentType.includes('jpeg') ||
    contentType.includes('jpg') ||
    portraitUrl.toLowerCase().match(/\.jpe?g/)
  ) {
    image = await pdfDoc.embedJpg(imageBytes);
  } else {
    // Optimistic fallback — try PNG first, then JPEG
    try {
      image = await pdfDoc.embedPng(imageBytes);
    } catch {
      image = await pdfDoc.embedJpg(imageBytes);
    }
  }

  // Scale image to fit within the printable area, preserving aspect ratio.
  const nameRowHeight = 56; // space reserved for pet name text
  const maxW = PAGE_WIDTH - MARGIN * 2;
  const maxH = PAGE_HEIGHT - MARGIN * 2 - nameRowHeight;

  const scale = Math.min(maxW / image.width, maxH / image.height);
  const imgW = image.width * scale;
  const imgH = image.height * scale;

  // Center horizontally; leave room at the bottom for the name
  const imgX = (PAGE_WIDTH - imgW) / 2;
  const imgY = MARGIN + nameRowHeight + (maxH - imgH) / 2;

  page.drawImage(image, { x: imgX, y: imgY, width: imgW, height: imgH });

  // Pet name centered below the portrait
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const fontSize = 28;
  const textWidth = font.widthOfTextAtSize(petName, fontSize);
  const textX = (PAGE_WIDTH - textWidth) / 2;
  const textY = MARGIN + nameRowHeight / 2 - fontSize / 2;

  page.drawText(petName, {
    x: textX,
    y: textY,
    size: fontSize,
    font,
    color: rgb(0.165, 0.125, 0.086), // approx #2a2016
  });

  const pdfBytes = await pdfDoc.save();
  console.log(`[create-portrait-pdf] PDF created — ${pdfBytes.byteLength} bytes`);
  return Buffer.from(pdfBytes);
}
