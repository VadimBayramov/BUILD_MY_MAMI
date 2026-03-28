import type { ParsedElement, ParsedScreen } from './html-parser';
import type {
  FunnelElement,
  ElementStyles,
  GlobalStyles,
  Screen,
  ElementIndexes,
} from '@typedefs/funnel';

// ── Shared utilities ──────────────────────────────────────────────────────────

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
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

// ── Legacy path: ParsedScreen → HTML (keeps html-parser pipeline working) ────

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

// ── New path: FunnelElement[] → HTML (source-of-truth → HTML) ────────────────

function styleObjectToString(styles: ElementStyles): string {
  return Object.entries(styles)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

/**
 * Renders a single FunnelElement and all its descendants into an HTML string.
 * Children are resolved via `elementIndexes.byParent[element.id]`.
 */
export function renderFunnelElement(
  element: FunnelElement,
  elements: Record<string, FunnelElement>,
  elementIndexes: ElementIndexes,
): string {
  const tag = element.tag.toLowerCase();
  const parts: string[] = [`<${tag}`];

  if (element.id) parts.push(` id="${escAttr(element.id)}"`);
  if (element.classes.length) parts.push(` class="${escAttr(element.classes.join(' '))}"`);

  // Canonical data attributes — always present for selection and export
  parts.push(` data-element="${escAttr(element.id)}"`);
  parts.push(` data-element-type="${escAttr(element.type)}"`);

  // Extra attributes (skip keys we already emitted)
  const SKIP = new Set(['data-element', 'data-element-type']);
  for (const [k, v] of Object.entries(element.attributes)) {
    if (!SKIP.has(k)) parts.push(` ${k}="${escAttr(v)}"`);
  }

  const styleStr = styleObjectToString(element.styles);
  if (styleStr) parts.push(` style="${escAttr(styleStr)}"`);

  if (VOID.has(tag)) {
    parts.push(' />');
    return parts.join('');
  }

  parts.push('>');
  if (element.content) parts.push(escText(element.content));

  // Recurse into children (ordered by byParent index)
  const childIds = elementIndexes.byParent[element.id] ?? [];
  for (const childId of childIds) {
    const child = elements[childId];
    if (child) parts.push(renderFunnelElement(child, elements, elementIndexes));
  }

  parts.push(`</${tag}>`);
  return parts.join('');
}

function globalStylesToCssVars(globalStyles: GlobalStyles): string {
  const vars = Object.entries(globalStyles)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return vars ? `:root {\n${vars}\n}` : '';
}

/**
 * Generates a full HTML fragment for one funnel screen from the elements tree.
 *
 * Structure:
 *   <style>
 *     :root { --bg: ...; --accent: ...; }          ← globalStyles
 *     [data-screen="X"] { --bg: #000; }            ← per-screen overrides
 *     /* custom CSS *\/
 *   </style>
 *   <main data-screen="X" class="funnel-screen" data-screen-type="survey">
 *     ...root elements...
 *   </main>
 */
export function generateScreenHtml(
  screenId: string,
  elements: Record<string, FunnelElement>,
  elementIndexes: ElementIndexes,
  screen: Screen,
  globalStyles: GlobalStyles,
): string {
  const cssChunks: string[] = [];

  // 1. CSS variables → :root { ... }
  const rootVars = globalStylesToCssVars(globalStyles);
  if (rootVars) cssChunks.push(rootVars);

  // 2. Per-screen overrides → [data-screen="X"] { --var: value; }
  const overrides = screen.customStyles.overrides ?? {};
  const overrideEntries = Object.entries(overrides).filter(([, v]) => v !== undefined && v !== '');
  if (overrideEntries.length > 0) {
    const vars = overrideEntries.map(([k, v]) => `  ${k}: ${v};`).join('\n');
    cssChunks.push(`[data-screen="${escAttr(screenId)}"] {\n${vars}\n}`);
  }

  // 3. Custom CSS block
  const customCss = screen.customStyles.customCss?.trim() ?? '';
  if (customCss) cssChunks.push(customCss);

  const chunks: string[] = [];
  if (cssChunks.length > 0) {
    chunks.push(`<style>\n${cssChunks.join('\n\n')}\n</style>`);
  }

  // 4. Screen wrapper <main>
  const customClass = screen.customStyles.customClass?.trim() ?? '';
  const classes = ['funnel-screen', customClass].filter(Boolean).join(' ');
  chunks.push(
    `<main data-screen="${escAttr(screenId)}" class="${escAttr(classes)}" data-screen-type="${escAttr(screen.type)}">`,
  );

  // 5. Root elements — parentId === null, keyed as __root__{screenId} in byParent
  const rootKey = `__root__${screenId}`;
  const rootIds = elementIndexes.byParent[rootKey] ?? [];
  for (const elId of rootIds) {
    const el = elements[elId];
    if (el) chunks.push(renderFunnelElement(el, elements, elementIndexes));
  }

  chunks.push('</main>');
  return chunks.join('\n');
}
