export function parseValue(value: string): { number: number; unit: string } {
  const m = value.trim().match(/^(-?\d*\.?\d+)([a-z%]*)$/i);
  if (!m || m[1] === undefined) return { number: 0, unit: '' };
  return { number: parseFloat(m[1]), unit: m[2] ?? '' };
}

export function formatValue(num: number, unit: string): string {
  return unit ? `${num}${unit}` : String(num);
}

export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
