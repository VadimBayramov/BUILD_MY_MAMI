const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+\s*)?\)$/i;

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && SLUG.test(slug);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidColor(color: string): boolean {
  const c = color.trim();
  if (HEX.test(c)) return true;
  return RGB.test(c);
}
