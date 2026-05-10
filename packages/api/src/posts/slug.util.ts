import slugify from 'slugify';

const VIETNAMESE_DIACRITICS_MAP: Record<string, string> = {
  đ: 'd',
  Đ: 'd',
};

export function makeSlug(input: string): string {
  let s = input.trim();
  for (const [k, v] of Object.entries(VIETNAMESE_DIACRITICS_MAP)) {
    s = s.split(k).join(v);
  }
  const base = slugify(s, { lower: true, strict: true, locale: 'vi' });
  return base.slice(0, 200);
}

export function appendDedupeSuffix(slug: string, n: number): string {
  if (n <= 1) return slug;
  return `${slug}-${n}`;
}
