import { describe, expect, test, beforeEach } from 'vitest';
import {
  getScreenHtml,
  invalidateScreenCache,
  invalidateAllCache,
  getCacheSize,
} from './html-cache';
import type { FunnelElement, ElementIndexes, Screen, GlobalStyles } from '@typedefs/funnel';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeElement(overrides: Partial<FunnelElement> & { id: string }): FunnelElement {
  return {
    type: 'paragraph',
    tag: 'p',
    content: 'text',
    screenId: 'scr',
    parentId: null,
    order: 0,
    styles: {},
    classes: [],
    attributes: {},
    i18n: {},
    visibility: 'always',
    animation: 'none',
    locked: false,
    customCss: '',
    editable: true,
    ...overrides,
  };
}

function makeScreen(id = 'scr'): Screen {
  return {
    id,
    order: 0,
    name: 'Test',
    type: 'survey',
    tags: [],
    position: { x: 0, y: 0 },
    settings: {
      progressBar: false,
      progressValue: 'auto',
      backButton: false,
      autoNavigate: false,
      navigationDelay: 0,
      scrollToTop: false,
      transitionAnimation: 'none',
    },
    customStyles: { overrides: {}, customCss: '', customClass: '' },
    customJs: { onEnter: '', onLeave: '', customScript: '' },
    customHead: { metaTags: [], ogTitle: '', ogImage: '', ogDescription: '', extraHead: '', i18n: {} },
    layout: {
      layoutType: 'default',
      headerVisible: false,
      footerVisible: false,
      backgroundImage: '',
      backgroundOverlay: '',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
    payment: null,
    conditions: { showIf: null, skipIf: null, abTest: null },
  };
}

function makeIndexes(elements: FunnelElement[], screenId = 'scr'): ElementIndexes {
  const byScreen: Record<string, string[]> = { [screenId]: [] };
  const byParent: Record<string, string[]> = { [`__root__${screenId}`]: [] };

  for (const el of elements) {
    byScreen[el.screenId] ??= [];
    byScreen[el.screenId]!.push(el.id);

    const parentKey = el.parentId ?? `__root__${el.screenId}`;
    byParent[parentKey] ??= [];
    byParent[parentKey]!.push(el.id);
  }

  return { byScreen, byParent };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('html-cache', () => {
  beforeEach(() => {
    invalidateAllCache();
  });

  test('cache is empty before first call', () => {
    expect(getCacheSize()).toBe(0);
  });

  test('getScreenHtml populates cache on first call', () => {
    getScreenHtml('s1', {}, makeIndexes([], 's1'), makeScreen('s1'), {});
    expect(getCacheSize()).toBe(1);
  });

  test('second call for same screen does not add to cache', () => {
    const screen = makeScreen('s1');
    const indexes = makeIndexes([], 's1');
    getScreenHtml('s1', {}, indexes, screen, {});
    getScreenHtml('s1', {}, indexes, screen, {});
    expect(getCacheSize()).toBe(1);
  });

  test('two different screens → cache size 2', () => {
    getScreenHtml('sa', {}, makeIndexes([], 'sa'), makeScreen('sa'), {});
    getScreenHtml('sb', {}, makeIndexes([], 'sb'), makeScreen('sb'), {});
    expect(getCacheSize()).toBe(2);
  });

  test('invalidateScreenCache removes only the specified screen', () => {
    getScreenHtml('sa', {}, makeIndexes([], 'sa'), makeScreen('sa'), {});
    getScreenHtml('sb', {}, makeIndexes([], 'sb'), makeScreen('sb'), {});
    expect(getCacheSize()).toBe(2);

    invalidateScreenCache('sa');
    expect(getCacheSize()).toBe(1);
  });

  test('invalidateAllCache clears everything', () => {
    getScreenHtml('s1', {}, makeIndexes([], 's1'), makeScreen('s1'), {});
    getScreenHtml('s2', {}, makeIndexes([], 's2'), makeScreen('s2'), {});
    invalidateAllCache();
    expect(getCacheSize()).toBe(0);
  });

  test('after invalidation HTML is regenerated with new content', () => {
    const el1 = makeElement({ id: 'p-1', content: 'Before' });
    const record1 = { [el1.id]: el1 };
    const indexes = makeIndexes([el1]);
    const screen = makeScreen();

    const html1 = getScreenHtml('scr', record1, indexes, screen, {});
    expect(html1).toContain('Before');

    invalidateScreenCache('scr');

    const el2 = makeElement({ id: 'p-1', content: 'After' });
    const record2 = { [el2.id]: el2 };
    const html2 = getScreenHtml('scr', record2, indexes, screen, {});
    expect(html2).toContain('After');
    expect(html2).not.toContain('Before');
  });

  test('cache returns identical string reference on hit', () => {
    const screen = makeScreen();
    const indexes = makeIndexes([]);
    const html1 = getScreenHtml('scr', {}, indexes, screen, {});
    const html2 = getScreenHtml('scr', {}, indexes, screen, {});
    expect(html1).toBe(html2);
  });

  test('globalStyles changes reflected after full invalidation', () => {
    const screen = makeScreen();
    const indexes = makeIndexes([]);
    const gs1: GlobalStyles = { '--accent': '#3b82f6' };
    const gs2: GlobalStyles = { '--accent': '#ef4444' };

    const html1 = getScreenHtml('scr', {}, indexes, screen, gs1);
    expect(html1).toContain('#3b82f6');

    invalidateScreenCache('scr');

    const html2 = getScreenHtml('scr', {}, indexes, screen, gs2);
    expect(html2).toContain('#ef4444');
    expect(html2).not.toContain('#3b82f6');
  });
});
