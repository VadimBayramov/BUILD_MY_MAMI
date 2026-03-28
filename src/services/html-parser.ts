import { ComponentParser } from './component-parser';
import type { ElementNode } from '@typedefs/component';

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

/** Adapt an ElementNode (content: string | null) to ParsedElement (content: string). */
function adaptNode(node: ElementNode): ParsedElement {
  return {
    tag: node.tag,
    id: node.id,
    classes: node.classes,
    attributes: node.attributes,
    styles: node.styles,
    content: node.content ?? '',
    children: node.children.map(adaptNode),
  };
}

export function parseHtml(html: string): ParsedScreen {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  const rawCss = ComponentParser.parseStyles(doc);

  let root: Element | null = body ? body.querySelector('[data-screen]') : null;
  if (!root) root = body;
  if (!root) {
    return { screenId: '', elements: [], rawCss };
  }
  const screenId = root.getAttribute('data-screen') ?? '';

  const elements: ParsedElement[] = [];
  for (const child of root.children) {
    if (child.tagName.toLowerCase() === 'style') continue;
    elements.push(adaptNode(ComponentParser.buildElementTree(child)));
  }

  return { screenId, elements, rawCss };
}
