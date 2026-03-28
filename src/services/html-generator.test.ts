import { describe, test, expect, beforeEach } from 'vitest';
import { generateScreenHtml, renderFunnelElement } from './html-generator';
import { parseHtml } from './html-parser';
import { getScreenHtml, invalidateScreenCache, invalidateAllCache, getCacheSize } from './html-cache';
import { createDefaultScreen } from '@store/defaults';
import type { FunnelElement, Screen, GlobalStyles, ElementIndexes } from '@typedefs/funnel';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildIndexes(elements: FunnelElement[]): ElementIndexes {
  const byScreen: Record<string, string[]> = {};
  const byParent: Record<string, string[]> = {};
  for (const el of elements) {
    (byScreen[el.screenId] ??= []).push(el.id);
    const key = el.parentId ?? `__root__${el.screenId}`;
    (byParent[key] ??= []).push(el.id);
  }
  return { byScreen, byParent };
}

const SCREEN_ID = 'test-screen';

function makeScreen(overrides?: Partial<Screen>): Screen {
  return {
    ...createDefaultScreen(SCREEN_ID, 'Test Screen', 'survey', { x: 0, y: 0 }, 0),
    ...overrides,
  };
}

function makeElement(partial: Partial<FunnelElement> & { id: string }): FunnelElement {
  return {
    screenId: SCREEN_ID,
    parentId: null,
    order: 0,
    type: 'custom',
    tag: 'div',
    classes: [],
    content: '',
    styles: {},
    attributes: {},
    i18n: {},
    visibility: 'always',
    animation: 'none',
    locked: false,
    customCss: '',
    editable: true,
    ...partial,
  };
}

const GLOBAL: GlobalStyles = {
  '--bg': '#ffffff',
  '--accent': '#3b82f6',
  '--text': '#1a1a2e',
};

// ── generateScreenHtml ────────────────────────────────────────────────────────

describe('generateScreenHtml', () => {
  test('output contains data-screen attribute', () => {
    const html = generateScreenHtml(SCREEN_ID, {}, buildIndexes([]), makeScreen(), {});
    expect(html).toContain(`data-screen="${SCREEN_ID}"`);
  });

  test('output contains funnel-screen class', () => {
    const html = generateScreenHtml(SCREEN_ID, {}, buildIndexes([]), makeScreen(), {});
    expect(html).toContain('funnel-screen');
  });

  test('output contains data-screen-type', () => {
    const html = generateScreenHtml(SCREEN_ID, {}, buildIndexes([]), makeScreen(), {});
    expect(html).toContain('data-screen-type="survey"');
  });

  test('includes :root CSS variables from globalStyles', () => {
    const html = generateScreenHtml(SCREEN_ID, {}, buildIndexes([]), makeScreen(), GLOBAL);
    expect(html).toContain(':root');
    expect(html).toContain('--bg: #ffffff');
    expect(html).toContain('--accent: #3b82f6');
    expect(html).toContain('--text: #1a1a2e');
  });

  test('includes per-screen overrides in [data-screen] block', () => {
    const screen = makeScreen({
      customStyles: { overrides: { '--bg': '#000000', '--accent': '#ff0000' }, customCss: '', customClass: '' },
    });
    const html = generateScreenHtml(SCREEN_ID, {}, buildIndexes([]), screen, GLOBAL);
    expect(html).toContain(`[data-screen="${SCREEN_ID}"]`);
    expect(html).toContain('--bg: #000000');
    expect(html).toContain('--accent: #ff0000');
  });

  test('includes customCss verbatim', () => {
    const screen = makeScreen({
      customStyles: { overrides: {}, customCss: '.hero { font-size: 48px; }', customClass: '' },
    });
    const html = generateScreenHtml(SCREEN_ID, {}, buildIndexes([]), screen, {});
    expect(html).toContain('.hero { font-size: 48px; }');
  });

  test('renders root FunnelElement with data-element + data-element-type', () => {
    const el = makeElement({ id: 'heading-abc', type: 'heading', tag: 'h1', content: 'Hello' });
    const record = { [el.id]: el };
    const html = generateScreenHtml(SCREEN_ID, record, buildIndexes([el]), makeScreen(), {});
    expect(html).toContain('data-element="heading-abc"');
    expect(html).toContain('data-element-type="heading"');
    expect(html).toContain('>Hello<');
  });

  test('renders element inline styles', () => {
    const el = makeElement({
      id: 'btn-1',
      type: 'button',
      tag: 'button',
      content: 'Click',
      styles: { 'background-color': '#ff0000', 'border-radius': '8px' },
    });
    const html = generateScreenHtml(SCREEN_ID, { [el.id]: el }, buildIndexes([el]), makeScreen(), {});
    expect(html).toContain('background-color: #ff0000');
    expect(html).toContain('border-radius: 8px');
  });

  test('renders CSS class on element', () => {
    const el = makeElement({ id: 'p-1', tag: 'p', classes: ['funnel-paragraph', 'muted'] });
    const html = generateScreenHtml(SCREEN_ID, { [el.id]: el }, buildIndexes([el]), makeScreen(), {});
    expect(html).toContain('class="funnel-paragraph muted"');
  });

  test('renders void elements self-closing', () => {
    const el = makeElement({ id: 'img-1', type: 'image', tag: 'img' });
    const html = generateScreenHtml(SCREEN_ID, { [el.id]: el }, buildIndexes([el]), makeScreen(), {});
    expect(html).toContain('<img');
    expect(html).toContain('/>');
    expect(html).not.toContain('</img>');
  });

  test('renders children nested inside parent', () => {
    const parent = makeElement({ id: 'container-aaa', type: 'container', tag: 'div', order: 0 });
    const child = makeElement({ id: 'btn-bbb', type: 'button', tag: 'button', content: 'Click', parentId: 'container-aaa', order: 0 });
    const record = { [parent.id]: parent, [child.id]: child };
    const html = generateScreenHtml(SCREEN_ID, record, buildIndexes([parent, child]), makeScreen(), {});

    // <div> opens before <button>, </div> closes after </button>
    expect(html.indexOf('<div')).toBeLessThan(html.indexOf('<button'));
    expect(html.indexOf('</div>')).toBeGreaterThan(html.indexOf('</button>'));
    expect(html).toContain('Click');
  });

  test('no <style> block when globalStyles and customStyles are empty', () => {
    const html = generateScreenHtml(SCREEN_ID, {}, buildIndexes([]), makeScreen(), {});
    expect(html).not.toContain('<style>');
  });

  // ── Round-trip ──────────────────────────────────────────────────────────────

  test('round-trip: generateScreenHtml → parseHtml preserves h1 element and content', () => {
    const heading = makeElement({
      id: 'heading-rt1',
      type: 'heading',
      tag: 'h1',
      classes: ['funnel-heading'],
      content: 'Round trip test',
      styles: { 'font-size': '32px' },
    });
    const record = { [heading.id]: heading };
    const html = generateScreenHtml(SCREEN_ID, record, buildIndexes([heading]), makeScreen(), {});

    const parsed = parseHtml(html);
    expect(parsed.screenId).toBe(SCREEN_ID);
    const h1 = parsed.elements.find((e) => e.tag === 'h1');
    expect(h1).toBeDefined();
    expect(h1!.content).toBe('Round trip test');
  });
});

// ── renderFunnelElement ───────────────────────────────────────────────────────

describe('renderFunnelElement', () => {
  test('renders standalone element correctly', () => {
    const el = makeElement({ id: 'p-standalone', tag: 'p', content: 'Hello world' });
    const html = renderFunnelElement(el, { [el.id]: el }, buildIndexes([el]));
    expect(html).toBe(
      '<p id="p-standalone" data-element="p-standalone" data-element-type="custom">Hello world</p>',
    );
  });

  test('escapes special characters in text content', () => {
    const el = makeElement({ id: 'p-esc', tag: 'p', content: '<b>bold</b> & "quotes"' });
    const html = renderFunnelElement(el, { [el.id]: el }, buildIndexes([el]));
    // & and < are escaped; " in text content does not require escaping
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt; &amp;');
    expect(html).toContain('"quotes"');
  });
});

// ── html-cache ────────────────────────────────────────────────────────────────

describe('html-cache', () => {
  beforeEach(() => {
    invalidateAllCache();
  });

  test('getScreenHtml caches on first call', () => {
    const el = makeElement({ id: 'heading-c1', type: 'heading', tag: 'h1', content: 'Cached' });
    const record = { [el.id]: el };
    const indexes = buildIndexes([el]);
    const screen = makeScreen();

    expect(getCacheSize()).toBe(0);
    getScreenHtml(SCREEN_ID, record, indexes, screen, {});
    expect(getCacheSize()).toBe(1);
    // Second call — no regeneration (same reference)
    const html1 = getScreenHtml(SCREEN_ID, record, indexes, screen, {});
    const html2 = getScreenHtml(SCREEN_ID, record, indexes, screen, {});
    expect(html1).toBe(html2);
  });

  test('invalidateScreenCache drops cache for that screen only', () => {
    getScreenHtml('screen-a', {}, buildIndexes([]), makeScreen(), {});
    getScreenHtml('screen-b', {}, buildIndexes([]), makeScreen(), {});
    expect(getCacheSize()).toBe(2);

    invalidateScreenCache('screen-a');
    expect(getCacheSize()).toBe(1);
  });

  test('invalidateAllCache empties the cache', () => {
    getScreenHtml('screen-x', {}, buildIndexes([]), makeScreen(), {});
    getScreenHtml('screen-y', {}, buildIndexes([]), makeScreen(), {});
    invalidateAllCache();
    expect(getCacheSize()).toBe(0);
  });

  test('after invalidation getScreenHtml regenerates HTML', () => {
    const el = makeElement({ id: 'btn-cache', type: 'button', tag: 'button', content: 'Before' });
    const record = { [el.id]: el };
    const indexes = buildIndexes([el]);
    const screen = makeScreen();

    const before = getScreenHtml(SCREEN_ID, record, indexes, screen, {});
    expect(before).toContain('Before');

    // Invalidate then call with updated content
    invalidateScreenCache(SCREEN_ID);
    const el2 = makeElement({ id: 'btn-cache', type: 'button', tag: 'button', content: 'After' });
    const record2 = { [el2.id]: el2 };
    const after = getScreenHtml(SCREEN_ID, record2, indexes, screen, {});
    expect(after).toContain('After');
  });
});
