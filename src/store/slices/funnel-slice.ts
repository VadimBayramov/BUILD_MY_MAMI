import { produceWithPatches } from 'immer';
import { nanoid } from 'nanoid';
import type { StateCreator } from 'zustand';
import type { FunnelActions } from '@typedefs/store';
import type { Screen, FunnelElement, ElementIndexes } from '@typedefs/funnel';
import type { ProjectDocument } from '@typedefs/project';
import type { HistoryEntry, HistoryState } from '@typedefs/ui';

export interface FunnelSlice extends FunnelActions {
  project: ProjectDocument;
  elementIndexes: ElementIndexes;
}

interface StoreWithHistory {
  project: ProjectDocument;
  history: HistoryState;
  elementIndexes: ElementIndexes;
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/;
const RESERVED_SLUGS = new Set([
  'api', 'admin', 'assets', 'static', 'css', 'js', 'images', 'fonts', 'favicon',
  'index', 'login', 'signup', 'auth', 'callback', 'webhook', 'health',
  'null', 'undefined', 'new', 'edit', 'delete', 'settings', 'export', 'import',
]);

function isValidSlug(slug: string, existingSlugs: string[]): boolean {
  if (!SLUG_REGEX.test(slug)) return false;
  if (slug.includes('--')) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  if (existingSlugs.includes(slug)) return false;
  return true;
}

function generateUniqueSlug(base: string, existingSlugs: string[]): string {
  if (isValidSlug(base, existingSlugs)) return base;
  let slug = `${base}-copy`;
  if (isValidSlug(slug, existingSlugs)) return slug;
  for (let i = 2; i < 100; i++) {
    slug = `${base}-copy-${i}`;
    if (isValidSlug(slug, existingSlugs)) return slug;
  }
  return `screen-${nanoid(6)}`;
}

export function buildElementIndexes(elements: Record<string, FunnelElement>): ElementIndexes {
  const byScreen: Record<string, string[]> = {};
  const byParent: Record<string, string[]> = {};

  for (const el of Object.values(elements)) {
    if (!byScreen[el.screenId]) byScreen[el.screenId] = [];
    byScreen[el.screenId]!.push(el.id);

    const parentKey = el.parentId ?? `__root__${el.screenId}`;
    if (!byParent[parentKey]) byParent[parentKey] = [];
    byParent[parentKey]!.push(el.id);
  }

  for (const ids of Object.values(byScreen)) {
    ids.sort((a, b) => (elements[a]?.order ?? 0) - (elements[b]?.order ?? 0));
  }
  for (const ids of Object.values(byParent)) {
    ids.sort((a, b) => (elements[a]?.order ?? 0) - (elements[b]?.order ?? 0));
  }

  return { byScreen, byParent };
}

export const createFunnelSlice: StateCreator<
  StoreWithHistory & FunnelActions,
  [],
  [],
  FunnelActions
> = (set, get) => {
  function undoableUpdate(
    description: string,
    updater: (draft: ProjectDocument) => void,
  ) {
    const state = get();
    const [nextProject, patches, inversePatches] = produceWithPatches(
      state.project,
      updater,
    );
    if (patches.length === 0) return;

    const entry: HistoryEntry = {
      patches,
      inversePatches,
      description,
      timestamp: Date.now(),
    };

    set({
      project: nextProject,
      elementIndexes: buildElementIndexes(nextProject.funnel.elements),
      history: {
        ...state.history,
        past: [...state.history.past, entry].slice(-state.history.maxEntries),
        future: [],
      },
    });
  }

  return {
    updateMeta: (updates) =>
      undoableUpdate('FUNNEL_UPDATE', (draft) => {
        Object.assign(draft.funnel.meta, updates);
      }),

    updateGlobalStyle: (variable, value) =>
      undoableUpdate('GLOBAL_STYLES_UPDATE', (draft) => {
        draft.funnel.globalStyles[variable] = value;
      }),

    updateGlobalStyles: (styles) =>
      undoableUpdate('GLOBAL_STYLES_UPDATE', (draft) => {
        Object.assign(draft.funnel.globalStyles, styles);
      }),

    addScreen: (screen) =>
      undoableUpdate('SCREEN_ADD', (draft) => {
        draft.funnel.screens[screen.id] = screen;
      }),

    deleteScreen: (screenId) =>
      undoableUpdate('SCREEN_DELETE', (draft) => {
        delete draft.funnel.screens[screenId];
        for (const [id, el] of Object.entries(draft.funnel.elements)) {
          if (el.screenId === screenId) delete draft.funnel.elements[id];
        }
        draft.funnel.connections = draft.funnel.connections.filter(
          (c) => c.from !== screenId && c.to !== screenId,
        );
        if (draft.funnel.meta.startScreenId === screenId) {
          const remaining = Object.keys(draft.funnel.screens);
          draft.funnel.meta.startScreenId = remaining[0] ?? '';
        }
      }),

    updateScreen: (screenId, updates) =>
      undoableUpdate('SCREEN_UPDATE', (draft) => {
        const screen = draft.funnel.screens[screenId];
        if (screen) Object.assign(screen, updates);
      }),

    renameScreen: (oldSlug, newSlug) => {
      const state = get();
      const existingSlugs = Object.keys(state.project.funnel.screens).filter(
        (s) => s !== oldSlug,
      );
      if (!isValidSlug(newSlug, existingSlugs)) return;

      undoableUpdate('SCREEN_RENAME', (draft) => {
        const screen = draft.funnel.screens[oldSlug];
        if (!screen) return;
        delete draft.funnel.screens[oldSlug];
        screen.id = newSlug;
        draft.funnel.screens[newSlug] = screen;

        for (const el of Object.values(draft.funnel.elements)) {
          if (el.screenId === oldSlug) el.screenId = newSlug;
        }
        for (const conn of draft.funnel.connections) {
          if (conn.from === oldSlug) conn.from = newSlug;
          if (conn.to === oldSlug) conn.to = newSlug;
        }
        if (draft.funnel.meta.startScreenId === oldSlug) {
          draft.funnel.meta.startScreenId = newSlug;
        }
      });
    },

    moveScreen: (screenId, position) =>
      undoableUpdate('SCREEN_MOVE', (draft) => {
        const screen = draft.funnel.screens[screenId];
        if (screen) screen.position = position;
      }),

    reorderScreen: (screenId, newOrder) =>
      undoableUpdate('SCREEN_REORDER', (draft) => {
        const screen = draft.funnel.screens[screenId];
        if (screen) screen.order = newOrder;
      }),

    duplicateScreen: (screenId) => {
      const state = get();
      const screen = state.project.funnel.screens[screenId];
      if (!screen) return '';
      const existingSlugs = Object.keys(state.project.funnel.screens);
      const newSlug = generateUniqueSlug(screenId, existingSlugs);

      undoableUpdate('SCREEN_DUPLICATE', (draft) => {
        const newScreen = JSON.parse(JSON.stringify(screen)) as Screen;
        newScreen.id = newSlug;
        newScreen.name = `${screen.name} (copy)`;
        newScreen.position = { x: screen.position.x + 300, y: screen.position.y };
        newScreen.order = Object.keys(draft.funnel.screens).length;
        draft.funnel.screens[newSlug] = newScreen;
      });

      return newSlug;
    },

    importScreenFromHtml: (_html, _fileName) => {
      return '';
    },

    addElement: (element) =>
      undoableUpdate('ELEMENT_ADD', (draft) => {
        draft.funnel.elements[element.id] = element;
      }),

    deleteElement: (elementId) =>
      undoableUpdate('ELEMENT_DELETE', (draft) => {
        const el = draft.funnel.elements[elementId];
        if (!el) return;
        const childIds = Object.values(draft.funnel.elements)
          .filter((e) => e.parentId === elementId)
          .map((e) => e.id);
        for (const childId of childIds) delete draft.funnel.elements[childId];
        delete draft.funnel.elements[elementId];
      }),

    updateElement: (elementId, updates) =>
      undoableUpdate('ELEMENT_UPDATE', (draft) => {
        const el = draft.funnel.elements[elementId];
        if (el) Object.assign(el, updates);
      }),

    updateElementStyle: (elementId, property, value) =>
      undoableUpdate('ELEMENT_UPDATE_STYLE', (draft) => {
        const el = draft.funnel.elements[elementId];
        if (el) el.styles[property] = value;
      }),

    moveElement: (elementId, targetScreenId, targetParentId, order) =>
      undoableUpdate('ELEMENT_MOVE', (draft) => {
        const el = draft.funnel.elements[elementId];
        if (el) {
          el.screenId = targetScreenId;
          el.parentId = targetParentId;
          el.order = order;
        }
      }),

    duplicateElement: (elementId) => {
      const state = get();
      const el = state.project.funnel.elements[elementId];
      if (!el) return '';
      const newId = `${el.type}-${nanoid(8)}`;

      undoableUpdate('ELEMENT_DUPLICATE', (draft) => {
        const copy = JSON.parse(JSON.stringify(el)) as FunnelElement;
        copy.id = newId;
        copy.order = el.order + 1;
        draft.funnel.elements[newId] = copy;
      });

      return newId;
    },

    addConnection: (connection) =>
      undoableUpdate('CONNECTION_ADD', (draft) => {
        draft.funnel.connections.push(connection);
      }),

    deleteConnection: (connectionId) =>
      undoableUpdate('CONNECTION_DELETE', (draft) => {
        draft.funnel.connections = draft.funnel.connections.filter(
          (c) => c.id !== connectionId,
        );
      }),

    updateConnection: (connectionId, updates) =>
      undoableUpdate('CONNECTION_UPDATE', (draft) => {
        const conn = draft.funnel.connections.find((c) => c.id === connectionId);
        if (conn) Object.assign(conn, updates);
      }),
  };
};
