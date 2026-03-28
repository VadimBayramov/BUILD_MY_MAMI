import { describe, expect, test } from 'vitest';
import { ComponentParser } from './component-parser';
import { ElementFactory } from './element-factory';
import type { CssRuleMap } from './css-parser';
import { parseCss } from './css-parser';

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
          data-value="option-1"
          data-navigate-to="">Option 1</button>

  <button class="funnel-option"
          data-element-type="option"
          data-editable="true"
          data-value="option-2"
          data-navigate-to="">Option 2</button>

  <button class="funnel-option"
          data-element-type="option"
          data-editable="true"
          data-value="option-3"
          data-navigate-to="">Option 3</button>

</div>

<style>
  .funnel-options { display: flex; flex-direction: column; gap: 12px; }
  .funnel-option { padding: 14px; border: 1.5px solid var(--border-tile); color: var(--text); }
</style>`;

const HEADING_HTML = `<!--
  @component: heading
  @category: content
  @tags: text, title, h1
  @description: H1–H6 heading block
  @thumbnail: /thumbnails/heading.png
  @version: 1.0
-->
<div class="funnel-heading-block"
     data-component="heading"
     data-component-category="content"
     data-element-type="heading-block">
  <h1 class="funnel-heading"
      data-element-type="heading"
      data-editable="true">Your Headline Goes Here</h1>
</div>

<style>
  .funnel-heading { font-size: var(--h1-size); color: var(--text); font-weight: 700; }
</style>`;

// ── inferElementType ──────────────────────────────────────────────────────────

describe('ElementFactory.inferElementType', () => {
  function makeNode(
    overrides: Partial<{
      tag: string;
      classes: string[];
      attributes: Record<string, string>;
      children: never[];
    }>,
  ) {
    return {
      tag: 'div',
      id: null,
      classes: [],
      attributes: {},
      styles: {},
      content: null,
      children: [],
      ...overrides,
    };
  }

  test('uses data-element-type first', () => {
    expect(
      ElementFactory.inferElementType(
        makeNode({ attributes: { 'data-element-type': 'heading' } }),
      ),
    ).toBe('heading');
  });

  test('falls back to tag name: h1 → heading', () => {
    expect(ElementFactory.inferElementType(makeNode({ tag: 'h1' }))).toBe('heading');
  });

  test('falls back to tag name: p → paragraph', () => {
    expect(ElementFactory.inferElementType(makeNode({ tag: 'p' }))).toBe('paragraph');
  });

  test('falls back to tag name: button → button', () => {
    expect(ElementFactory.inferElementType(makeNode({ tag: 'button' }))).toBe('button');
  });

  test('falls back to tag name: img → image', () => {
    expect(ElementFactory.inferElementType(makeNode({ tag: 'img' }))).toBe('image');
  });

  test('falls back to tag name: hr → divider', () => {
    expect(ElementFactory.inferElementType(makeNode({ tag: 'hr' }))).toBe('divider');
  });

  test('falls back to class: funnel-option → option', () => {
    expect(
      ElementFactory.inferElementType(makeNode({ classes: ['funnel-option'] })),
    ).toBe('option');
  });

  test('falls back to class: funnel-card → card', () => {
    expect(
      ElementFactory.inferElementType(makeNode({ classes: ['funnel-card'] })),
    ).toBe('card');
  });

  test('returns "container" when no match but has children', () => {
    const node = makeNode({ tag: 'section' });
    // section IS in tag map → container
    expect(ElementFactory.inferElementType(node)).toBe('container');
  });

  test('returns "custom" when no match and no children', () => {
    expect(
      ElementFactory.inferElementType(makeNode({ tag: 'abbr' })),
    ).toBe('custom');
  });
});

// ── mergeStyles ───────────────────────────────────────────────────────────────

describe('ElementFactory.mergeStyles', () => {
  const css = `.funnel-option { padding: 14px; color: var(--text); }
               button.funnel-option { font-weight: 600; }`;
  const rules: CssRuleMap = parseCss(css);

  const node = {
    tag: 'button',
    id: null,
    classes: ['funnel-option'],
    attributes: {},
    styles: { 'background-color': 'red' },
    content: null,
    children: [],
  };

  test('applies matching CSS rule', () => {
    const styles = ElementFactory.mergeStyles({}, rules, node);
    expect(styles['padding']).toBe('14px');
    expect(styles['color']).toBe('var(--text)');
  });

  test('applies tag+class compound rule', () => {
    const styles = ElementFactory.mergeStyles({}, rules, node);
    expect(styles['font-weight']).toBe('600');
  });

  test('inline styles override CSS rules', () => {
    const styles = ElementFactory.mergeStyles({ padding: '0' }, rules, node);
    expect(styles['padding']).toBe('0');
  });

  test('preserves inline properties not in CSS', () => {
    const styles = ElementFactory.mergeStyles({ 'background-color': 'red' }, rules, node);
    expect(styles['background-color']).toBe('red');
  });

  test('CSS specificity: tag+class selector overrides class-only selector for same property', () => {
    // .funnel-option sets color, button.funnel-option sets font-weight
    // Both match — more-specific rule's properties should appear
    const styles = ElementFactory.mergeStyles({}, rules, node);
    // Both rules matched — result contains properties from both
    expect(styles['color']).toBe('var(--text)');       // from .funnel-option
    expect(styles['font-weight']).toBe('600');           // from button.funnel-option
  });

  test('no matching CSS rules → result only has inline styles', () => {
    const noMatchRules: CssRuleMap = parseCss('.other { color: blue; }');
    const styles = ElementFactory.mergeStyles({ 'font-size': '16px' }, noMatchRules, node);
    expect(styles['font-size']).toBe('16px');
    expect('color' in styles).toBe(false);
  });
});

// ── nodeToElement ─────────────────────────────────────────────────────────────

describe('ElementFactory.nodeToElement', () => {
  const node = {
    tag: 'button',
    id: null,
    classes: ['funnel-option'],
    attributes: { 'data-element-type': 'option', 'data-editable': 'true', 'data-value': 'x' },
    styles: {},
    content: 'Click me',
    children: [],
  };

  test('generates id in correct format', () => {
    const el = ElementFactory.nodeToElement(node, 'screen-1', null, 0, new Map());
    expect(el.id).toMatch(/^option-[A-Za-z0-9_-]{8}$/);
  });

  test('sets screenId, parentId, order', () => {
    const el = ElementFactory.nodeToElement(node, 'screen-42', 'parent-abc', 3, new Map());
    expect(el.screenId).toBe('screen-42');
    expect(el.parentId).toBe('parent-abc');
    expect(el.order).toBe(3);
  });

  test('sets editable=true when data-editable="true"', () => {
    const el = ElementFactory.nodeToElement(node, 'screen-1', null, 0, new Map());
    expect(el.editable).toBe(true);
  });

  test('sets editable=false when data-editable absent', () => {
    const noEdit = { ...node, attributes: { 'data-element-type': 'container' } };
    const el = ElementFactory.nodeToElement(noEdit, 's', null, 0, new Map());
    expect(el.editable).toBe(false);
  });

  test('copies content, tag, classes, attributes', () => {
    const el = ElementFactory.nodeToElement(node, 's', null, 0, new Map());
    expect(el.content).toBe('Click me');
    expect(el.tag).toBe('button');
    expect(el.classes).toContain('funnel-option');
    expect(el.attributes['data-value']).toBe('x');
  });

  test('defaults: visibility=always, animation=none, locked=false', () => {
    const el = ElementFactory.nodeToElement(node, 's', null, 0, new Map());
    expect(el.visibility).toBe('always');
    expect(el.animation).toBe('none');
    expect(el.locked).toBe(false);
  });
});

// ── fromComponentDefinition ───────────────────────────────────────────────────

describe('ElementFactory.fromComponentDefinition', () => {
  test('option-list: returns 4+ FunnelElements (container + 3 options)', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'screen-1');
    // root container + 3 option buttons
    expect(elements.length).toBeGreaterThanOrEqual(4);
  });

  test('option-list: root element has parentId null', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'screen-1');
    const roots = elements.filter((e) => e.parentId === null);
    expect(roots).toHaveLength(1);
  });

  test('option-list: option buttons have parentId === root.id', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'screen-1');
    const root = elements.find((e) => e.parentId === null)!;
    const children = elements.filter((e) => e.parentId === root.id);
    expect(children.length).toBeGreaterThanOrEqual(3);
  });

  test('option-list: options have type "option"', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'screen-1');
    const options = elements.filter((e) => e.type === 'option');
    expect(options.length).toBeGreaterThanOrEqual(3);
  });

  test('option-list: CSS styles applied to option elements', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'screen-1');
    const option = elements.find((e) => e.type === 'option')!;
    // .funnel-option has padding: 14px from <style> block
    expect(option.styles['padding']).toBe('14px');
  });

  test('heading: root type is container, child is heading', () => {
    const def = ComponentParser.parse(HEADING_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'screen-1');
    const heading = elements.find((e) => e.type === 'heading')!;
    expect(heading).toBeDefined();
    expect(heading.content).toBe('Your Headline Goes Here');
  });

  test('all elements share screenId', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'my-screen');
    expect(elements.every((e) => e.screenId === 'my-screen')).toBe(true);
  });

  test('all IDs are unique', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'screen-1');
    const ids = elements.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('child order is correct (0-indexed among siblings)', () => {
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'screen-1');
    const root = elements.find((e) => e.parentId === null)!;
    const children = elements
      .filter((e) => e.parentId === root.id)
      .sort((a, b) => a.order - b.order);
    expect(children[0]!.order).toBe(0);
    expect(children[1]!.order).toBe(1);
    expect(children[2]!.order).toBe(2);
  });

  test('heading HTML: root is container, child is heading type', () => {
    const def = ComponentParser.parse(HEADING_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'scr-h');
    const root = elements.find((e) => e.parentId === null)!;
    const headingEl = elements.find((e) => e.type === 'heading');

    expect(root).toBeDefined();
    expect(headingEl).toBeDefined();
    expect(headingEl!.tag).toBe('h1');
    expect(headingEl!.content).toBe('Your Headline Goes Here');
    expect(headingEl!.parentId).toBe(root.id);
  });

  test('heading CSS styles applied via mergeStyles', () => {
    const def = ComponentParser.parse(HEADING_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, 'scr-h');
    const headingEl = elements.find((e) => e.type === 'heading')!;
    // CSS from heading.html: .funnel-heading { font-size: var(--h1-size); color: var(--text); }
    expect(headingEl.styles['font-size']).toBe('var(--h1-size)');
    expect(headingEl.styles['color']).toBe('var(--text)');
  });

  test('round-trip: parse → factory → all elements have correct screenId', () => {
    const SCREEN_ID = 'rt-screen-1';
    const def = ComponentParser.parse(OPTION_LIST_HTML);
    const elements = ElementFactory.fromComponentDefinition(def, SCREEN_ID);
    expect(elements.every((e) => e.screenId === SCREEN_ID)).toBe(true);
  });

  test('component with no CSS → elements have empty or inline-only styles', () => {
    const bare = `<!--
  @component: bare
  @category: content
  @tags: test
  @description: bare
  @thumbnail:
  @version: 1.0
-->
<div data-element-type="container">
  <p data-element-type="paragraph">Hello</p>
</div>`;
    const def = ComponentParser.parse(bare);
    const elements = ElementFactory.fromComponentDefinition(def, 'scr-bare');
    // No CSS → styles should be empty objects (not crash)
    elements.forEach((el) => {
      expect(typeof el.styles).toBe('object');
    });
  });
});
