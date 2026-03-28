import type { ComponentDefinition, ComponentMeta, ElementNode } from '@typedefs/component';

/**
 * ComponentParser — static class that turns an HTML component string
 * (from block-library/*.html) into a ComponentDefinition.
 *
 * Algorithm (§10.2):
 *   1. DOMParser → Document
 *   2. parseMetaComment  — extract @component, @category … from HTML comment
 *   3. Root element      — doc.body.firstElementChild
 *   4. parseStyles       — collect all <style> blocks as string
 *   5. parseScripts      — collect <script> blocks (optional)
 *   6. buildElementTree  — recursive DOM walk → ElementNode tree
 */
export class ComponentParser {
  // ── Public API ────────────────────────────────────────────────────────────

  static parse(htmlString: string): ComponentDefinition {
    const meta = ComponentParser.parseMetaComment(htmlString);
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');

    const root = doc.body.firstElementChild;
    if (!root) {
      throw new Error('[ComponentParser] No root element found in HTML string.');
    }

    const styles = ComponentParser.parseStyles(doc);
    const scripts = ComponentParser.parseScripts(doc);
    const elementTree = ComponentParser.buildElementTree(root);

    return { meta, html: htmlString, styles, scripts, elementTree };
  }

  /** Extract @-tagged metadata from the leading HTML comment block. */
  static parseMetaComment(html: string): ComponentMeta {
    const commentMatch = html.match(/<!--([\s\S]*?)-->/);
    const block = commentMatch?.[1] ?? '';

    function extract(key: string): string {
      const m = block.match(new RegExp(`@${key}:\\s*(.+?)(?=\\r?\\n|$)`));
      return m?.[1]?.trim() ?? '';
    }

    const tagsRaw = extract('tags');
    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    return {
      component: extract('component'),
      category: extract('category'),
      tags,
      description: extract('description'),
      thumbnail: extract('thumbnail'),
      version: extract('version'),
    };
  }

  /**
   * Recursively build an ElementNode tree from a DOM Element.
   * Skips <style> and <script> children.
   */
  static buildElementTree(node: Element): ElementNode {
    const tag = node.tagName.toLowerCase();
    const id = node.id || null;
    const classes = node.classList ? [...node.classList] : [];
    const attributes = ComponentParser._allAttributes(node);
    const styles = ComponentParser.getInlineStyles(node);
    const content = ComponentParser._directText(node);

    const children: ElementNode[] = [];
    for (const child of node.children) {
      const t = child.tagName.toLowerCase();
      if (t === 'style' || t === 'script') continue;
      children.push(ComponentParser.buildElementTree(child));
    }

    return { tag, id, classes, attributes, styles, content, children };
  }

  /** Collect all <style> blocks from the document, joined with double newline. */
  static parseStyles(doc: Document): string {
    const blocks: string[] = [];
    doc.querySelectorAll('style').forEach((s) => {
      const text = s.textContent?.trim();
      if (text) blocks.push(text);
    });
    return blocks.join('\n\n');
  }

  /** Collect all <script> blocks from the document (empty string if none). */
  static parseScripts(doc: Document): string {
    const blocks: string[] = [];
    doc.querySelectorAll('script').forEach((s) => {
      const text = s.textContent?.trim();
      if (text) blocks.push(text);
    });
    return blocks.join('\n\n');
  }

  /** Return only data-* attributes from a DOM element. */
  static getDataAttributes(node: Element): Record<string, string> {
    const out: Record<string, string> = {};
    for (const attr of node.attributes) {
      if (attr.name.startsWith('data-')) {
        out[attr.name] = attr.value;
      }
    }
    return out;
  }

  /** Parse the inline `style` attribute into a property map. */
  static getInlineStyles(node: Element): Record<string, string> {
    const out: Record<string, string> = {};
    const styleAttr = node.getAttribute('style') ?? '';
    for (const part of styleAttr.split(';')) {
      const idx = part.indexOf(':');
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim().toLowerCase();
      const val = part.slice(idx + 1).trim();
      if (key) out[key] = val;
    }
    return out;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** All attributes except style / id / class → stored in ElementNode.attributes. */
  private static _allAttributes(node: Element): Record<string, string> {
    const out: Record<string, string> = {};
    const skip = new Set(['style', 'id', 'class']);
    for (const attr of node.attributes) {
      if (skip.has(attr.name.toLowerCase())) continue;
      out[attr.name] = attr.value;
    }
    return out;
  }

  /** Concatenated direct TEXT_NODE children (trims, joins with space). */
  private static _directText(el: Element): string | null {
    let s = '';
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = (n.textContent ?? '').trim();
        if (t) s += (s ? ' ' : '') + t;
      }
    }
    return s || null;
  }
}
