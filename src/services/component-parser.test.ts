import { describe, expect, test } from 'vitest';
import { ComponentParser } from './component-parser';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const OPTION_LIST_HTML = `<!--
  @component: option-list
  @category: interactive
  @tags: survey, options, selection, list
  @description: Vertical list of selectable options
  @thumbnail: /thumbnails/option-list.png
  @version: 1.0
-->
<div class="funnel-options"
     data-component="option-list"
     data-component-category="interactive"
     data-element-type="option-list">

  <button class="funnel-option"
          data-element-type="option"
          data-editable="true"
          data-value="option-1">
    Option 1
  </button>

  <button class="funnel-option"
          data-element-type="option"
          data-editable="true"
          data-value="option-2">
    Option 2
  </button>

  <button class="funnel-option"
          data-element-type="option"
          data-editable="true"
          data-value="option-3">
    Option 3
  </button>

</div>

<style>
  .funnel-options { display: flex; flex-direction: column; gap: 12px; }
  .funnel-option { padding: 14px; border: 1.5px solid var(--border-tile); }
</style>`;

const HEADING_HTML = `<!--
  @component: heading
  @category: titles
  @tags: text, title, h1
  @description: H1–H6 heading block
  @thumbnail: /thumbnails/heading.png
  @version: 1.0
-->
<div class="funnel-heading-block"
     data-component="heading"
     data-component-category="titles"
     data-element-type="heading-block">
  <h1 class="funnel-heading"
      data-element-type="heading"
      data-editable="true">
    Your Headline Goes Here
  </h1>
</div>

<style>
  .funnel-heading { font-size: var(--h1-size); color: var(--text); }
</style>`;

const NO_COMMENT_HTML = `<div class="funnel-card" data-component="card">
  <p class="funnel-text" style="color: red; font-size: 16px;">Hello</p>
</div>`;

// ── parseMetaComment ──────────────────────────────────────────────────────────

describe('ComponentParser.parseMetaComment', () => {
  test('extracts all meta fields from option-list', () => {
    const meta = ComponentParser.parseMetaComment(OPTION_LIST_HTML);
    expect(meta.component).toBe('option-list');
    expect(meta.category).toBe('interactive');
    expect(meta.tags).toEqual(['survey', 'options', 'selection', 'list']);
    expect(meta.description).toBe('Vertical list of selectable options');
    expect(meta.thumbnail).toBe('/thumbnails/option-list.png');
    expect(meta.version).toBe('1.0');
  });

  test('returns empty strings when no comment is present', () => {
    const meta = ComponentParser.parseMetaComment(NO_COMMENT_HTML);
    expect(meta.component).toBe('');
    expect(meta.category).toBe('');
    expect(meta.tags).toEqual([]);
  });
});

// ── parseStyles ───────────────────────────────────────────────────────────────

describe('ComponentParser.parseStyles', () => {
  test('collects <style> block content', () => {
    const doc = new DOMParser().parseFromString(OPTION_LIST_HTML, 'text/html');
    const styles = ComponentParser.parseStyles(doc);
    expect(styles).toContain('.funnel-options');
    expect(styles).toContain('.funnel-option');
  });

  test('returns empty string when no <style> blocks', () => {
    const doc = new DOMParser().parseFromString('<div></div>', 'text/html');
    expect(ComponentParser.parseStyles(doc)).toBe('');
  });

  test('joins multiple <style> blocks with newline', () => {
    const html = '<div></div><style>.a { color: red; }</style><style>.b { color: blue; }</style>';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const styles = ComponentParser.parseStyles(doc);
    expect(styles).toContain('.a');
    expect(styles).toContain('.b');
    // both blocks present in one string
    expect(styles.indexOf('.a')).toBeLessThan(styles.indexOf('.b'));
  });
});

// ── parseScripts ─────────────────────────────────────────────────────────────

describe('ComponentParser.parseScripts', () => {
  test('returns empty string when no scripts', () => {
    const doc = new DOMParser().parseFromString(OPTION_LIST_HTML, 'text/html');
    expect(ComponentParser.parseScripts(doc)).toBe('');
  });

  test('collects script block content', () => {
    const html = '<div></div><script>console.log("hi")</script>';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(ComponentParser.parseScripts(doc)).toContain('console.log');
  });
});

// ── getDataAttributes ─────────────────────────────────────────────────────────

describe('ComponentParser.getDataAttributes', () => {
  test('returns only data-* attributes', () => {
    const doc = new DOMParser().parseFromString(
      '<button class="btn" data-value="x" data-navigate-to="" id="b1">OK</button>',
      'text/html',
    );
    const btn = doc.querySelector('button')!;
    const attrs = ComponentParser.getDataAttributes(btn);
    expect(attrs['data-value']).toBe('x');
    expect(attrs['data-navigate-to']).toBe('');
    expect('class' in attrs).toBe(false);
    expect('id' in attrs).toBe(false);
  });
});

// ── getInlineStyles ───────────────────────────────────────────────────────────

describe('ComponentParser.getInlineStyles', () => {
  test('parses inline style attribute into a record', () => {
    const doc = new DOMParser().parseFromString(
      '<p style="color: red; font-size: 16px;">text</p>',
      'text/html',
    );
    const p = doc.querySelector('p')!;
    const styles = ComponentParser.getInlineStyles(p);
    expect(styles['color']).toBe('red');
    expect(styles['font-size']).toBe('16px');
  });

  test('returns empty object when no style attribute', () => {
    const doc = new DOMParser().parseFromString('<p>text</p>', 'text/html');
    expect(ComponentParser.getInlineStyles(doc.querySelector('p')!)).toEqual({});
  });
});

// ── buildElementTree ──────────────────────────────────────────────────────────

describe('ComponentParser.buildElementTree', () => {
  test('builds correct tree from heading HTML', () => {
    const doc = new DOMParser().parseFromString(HEADING_HTML, 'text/html');
    const root = doc.body.firstElementChild!;
    const tree = ComponentParser.buildElementTree(root);

    expect(tree.tag).toBe('div');
    expect(tree.classes).toContain('funnel-heading-block');
    expect(tree.attributes['data-component']).toBe('heading');
    // h1 child (style block is skipped)
    expect(tree.children).toHaveLength(1);
    const h1 = tree.children[0]!;
    expect(h1.tag).toBe('h1');
    expect(h1.content).toBe('Your Headline Goes Here');
  });

  test('skips <style> children', () => {
    const doc = new DOMParser().parseFromString(
      '<div><p>text</p><style>.a{}</style></div>',
      'text/html',
    );
    const tree = ComponentParser.buildElementTree(doc.body.firstElementChild!);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]!.tag).toBe('p');
  });

  test('captures inline styles on element', () => {
    const doc = new DOMParser().parseFromString(
      '<div style="width: 100%"><span>hi</span></div>',
      'text/html',
    );
    const tree = ComponentParser.buildElementTree(doc.body.firstElementChild!);
    expect(tree.styles['width']).toBe('100%');
  });

  test('content is null when no direct text', () => {
    const doc = new DOMParser().parseFromString(
      '<div><span>child</span></div>',
      'text/html',
    );
    const tree = ComponentParser.buildElementTree(doc.body.firstElementChild!);
    expect(tree.content).toBeNull();
  });

  test('builds 3-level deep tree recursively', () => {
    const html = '<section><div><p>Deep text</p></div></section>';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tree = ComponentParser.buildElementTree(doc.body.firstElementChild!);

    expect(tree.tag).toBe('section');
    expect(tree.children).toHaveLength(1);
    const div = tree.children[0]!;
    expect(div.tag).toBe('div');
    expect(div.children).toHaveLength(1);
    const p = div.children[0]!;
    expect(p.tag).toBe('p');
    expect(p.content).toBe('Deep text');
    expect(p.children).toHaveLength(0);
  });

  test('multiple sibling children all captured', () => {
    const html = '<div><h1>A</h1><p>B</p><button>C</button></div>';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tree = ComponentParser.buildElementTree(doc.body.firstElementChild!);
    expect(tree.children).toHaveLength(3);
    expect(tree.children.map((c) => c.tag)).toEqual(['h1', 'p', 'button']);
  });
});

// ── parse (main integration) ──────────────────────────────────────────────────

describe('ComponentParser.parse', () => {
  test('option-list: meta.component === "option-list"', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    expect(def.meta.component).toBe('option-list');
  });

  test('option-list: elementTree.children.length >= 2', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    expect(def.elementTree.children.length).toBeGreaterThanOrEqual(2);
  });

  test('option-list: styles contains CSS', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    expect(def.styles).toContain('.funnel-options');
  });

  test('option-list: elementTree root has correct data-component', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    expect(def.elementTree.attributes['data-component']).toBe('option-list');
  });

  test('heading: category is "titles"', () => {
    const def = ComponentParser.parse(HEADING_HTML);
    expect(def.meta.category).toBe('titles');
    expect(def.meta.tags).toContain('h1');
  });

  test('throws when HTML has no root element', () => {
    expect(() => ComponentParser.parse('')).toThrow('[ComponentParser]');
  });

  test('html field equals original string', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    expect(def.html).toBe(OPTION_LIST_HTML);
  });

  test('no meta comment → all meta fields are empty strings / empty array', () => {
    const def = ComponentParser.parse(NO_COMMENT_HTML);
    expect(def.meta.component).toBe('');
    expect(def.meta.category).toBe('');
    expect(def.meta.tags).toEqual([]);
    expect(def.meta.description).toBe('');
  });

  test('no meta comment → elementTree and styles still populated', () => {
    const def = ComponentParser.parse(NO_COMMENT_HTML);
    expect(def.elementTree.tag).toBe('div');
    // <p> is a child
    expect(def.elementTree.children.length).toBeGreaterThanOrEqual(1);
  });

  test('@tags parsed as array (comma-separated)', () => {
    const meta = ComponentParser.parseMetaComment(OPTION_LIST_HTML);
    expect(Array.isArray(meta.tags)).toBe(true);
    expect(meta.tags).toContain('survey');
    expect(meta.tags).toContain('options');
    expect(meta.tags).toContain('selection');
  });
});
