import { nanoid } from 'nanoid';

export function generateId(prefix: string): string {
  return `${prefix}-${nanoid(8)}`;
}

export function generateScreenSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'screen';
}
