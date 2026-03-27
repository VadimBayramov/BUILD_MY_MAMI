export interface ParsedElement {
  tag: string;
  id: string | null;
  classes: string[];
  attributes: Record<string, string>;
  styles: Record<string, string>;
  content: string;
  children: ParsedElement[];
}

export interface ParsedScreen {
  screenId: string;
  elements: ParsedElement[];
  rawCss: string;
}

function parseInlineStyle(styleAttr: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of styleAttr.split(';')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

function directTextContent(el: Element): string {
  let s = '';
  for (const n of el.childNodes) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = (n.textContent ?? '').trim();
      if (t) s += (s ? ' ' : '') + t;
    }
  }
  return s;
}

function attrsToRecord(el: Element, skip: Set<string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of el.attributes) {
    if (skip.has(a.name.toLowerCase())) continue;
    out[a.name] = a.value;
  }
  return out;
}

function parseElement(el: Element): ParsedElement {
  const tag = el.tagName.toLowerCase();
  const id = el.id || null;
  const classes = el.classList ? [...el.classList] : [];
  const styles = parseInlineStyle(el.getAttribute('style') ?? '');
  const attributes = attrsToRecord(el, new Set(['style', 'id', 'class']));
  const content = directTextContent(el);
  const children: ParsedElement[] = [];
  for (const child of el.children) {
    const t = child.tagName.toLowerCase();
    if (t === 'style') continue;
    children.push(parseElement(child));
  }
  return { tag, id, classes, attributes, styles, content, children };
}

export function parseHtml(html: string): ParsedScreen {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  const styleBlocks: string[] = [];
  doc.querySelectorAll('style').forEach((s) => {
    styleBlocks.push(s.textContent ?? '');
  });
  const rawCss = styleBlocks.join('\n\n').trim();

  let root: Element | null = body ? body.querySelector('[data-screen]') : null;
  if (!root) root = body;
  if (!root) {
    return { screenId: '', elements: [], rawCss };
  }
  const screenId = root.getAttribute('data-screen') ?? '';

  const elements: ParsedElement[] = [];
  for (const child of root.children) {
    if (child.tagName.toLowerCase() === 'style') continue;
    elements.push(parseElement(child));
  }

  return { screenId, elements, rawCss };
}
