import type { ParsedElement, ParsedScreen } from './html-parser';

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function serializeStyles(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

function renderElement(e: ParsedElement): string {
  const tag = e.tag.toLowerCase();
  const parts: string[] = [`<${tag}`];
  if (e.id) parts.push(` id="${escAttr(e.id)}"`);
  if (e.classes.length) parts.push(` class="${escAttr(e.classes.join(' '))}"`);
  for (const [k, v] of Object.entries(e.attributes)) {
    parts.push(` ${k}="${escAttr(v)}"`);
  }
  if (Object.keys(e.styles).length) {
    parts.push(` style="${escAttr(serializeStyles(e.styles))}"`);
  }
  if (VOID.has(tag)) {
    parts.push(' />');
    return parts.join('');
  }
  parts.push('>');
  if (e.content) parts.push(escText(e.content));
  for (const c of e.children) parts.push(renderElement(c));
  parts.push(`</${tag}>`);
  return parts.join('');
}

export function generateHtml(screen: ParsedScreen): string {
  const chunks: string[] = [];
  if (screen.rawCss.trim()) {
    chunks.push(`<style>${screen.rawCss}</style>`);
  }
  const dataScreen = screen.screenId ? ` data-screen="${escAttr(screen.screenId)}"` : '';
  chunks.push(`<div${dataScreen}>`);
  for (const el of screen.elements) chunks.push(renderElement(el));
  chunks.push('</div>');
  return chunks.join('');
}
