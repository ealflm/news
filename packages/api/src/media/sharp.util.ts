import sharp from 'sharp';

export interface ImageProcessOutput {
  variants: Record<string, Buffer>;
  width: number;
  height: number;
}

const TARGET_WIDTHS = [320, 720, 1280, 1920] as const;

export async function processImage(input: Buffer): Promise<ImageProcessOutput> {
  const meta = await sharp(input).metadata();
  const origW = meta.width ?? 1920;
  const origH = meta.height ?? 1080;

  const out: Record<string, Buffer> = {};

  for (const w of TARGET_WIDTHS) {
    if (w > origW) continue;
    const base = sharp(input).resize({ width: w, withoutEnlargement: true });
    out[`${w}w`] = await base.clone().jpeg({ quality: 82, progressive: true }).toBuffer();
    out[`webp_${w}w`] = await base.clone().webp({ quality: 82 }).toBuffer();
    out[`avif_${w}w`] = await base.clone().avif({ quality: 60 }).toBuffer();
  }

  if (Object.keys(out).length === 0) {
    out['orig'] = await sharp(input).jpeg({ quality: 90 }).toBuffer();
    out['webp_orig'] = await sharp(input).webp({ quality: 88 }).toBuffer();
  }

  return { variants: out, width: origW, height: origH };
}
