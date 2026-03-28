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

function getNextUpdatedAt(currentUpdatedAt: string): string {
  const now = Date.now();
  const current = new Date(currentUpdatedAt).getTime();
  return new Date(Math.max(now, current + 1)).toISOString();
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
      (draft) => {
        updater(draft);
        draft.updatedAt = getNextUpdatedAt(draft.updatedAt);
      },
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

    deleteScreens: (screenIds) => {
      if (screenIds.length === 0) return;
      if (screenIds.length === 1) {
        get().deleteScreen(screenIds[0]!);
        return;
      }
      const idsSet = new Set(screenIds);
      undoableUpdate('SCREENS_BATCH_DELETE', (draft) => {
        for (const sid of idsSet) {
          delete draft.funnel.screens[sid];
          for (const [eid, el] of Object.entries(draft.funnel.elements)) {
            if (el.screenId === sid) delete draft.funnel.elements[eid];
          }
        }
        draft.funnel.connections = draft.funnel.connections.filter(
          (c) => !idsSet.has(c.from) && !idsSet.has(c.to),
        );
        if (idsSet.has(draft.funnel.meta.startScreenId)) {
          const remaining = Object.keys(draft.funnel.screens);
          draft.funnel.meta.startScreenId = remaining[0] ?? '';
        }
      });
    },

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

    batchMoveScreens: (positions) =>
      undoableUpdate('SCREENS_BATCH_MOVE', (draft) => {
        for (const [id, pos] of Object.entries(positions)) {
          const screen = draft.funnel.screens[id];
          if (screen) screen.position = pos;
        }
      }),

    duplicateScreen: (screenId) => {
      const state = get();
      const screen = state.project.funnel.screens[screenId];
      if (!screen) return '';
      const existingSlugs = Object.keys(state.project.funnel.screens);
      const newSlug = generateUniqueSlug(screenId, existingSlugs);

      const screenElements = Object.values(state.project.funnel.elements).filter(
        (el) => el.screenId === screenId,
      );

      const newOrder = screen.order + 1;

      undoableUpdate('SCREEN_DUPLICATE', (draft) => {
        for (const s of Object.values(draft.funnel.screens)) {
          if (s.order >= newOrder) s.order += 1;
        }

        const newScreen = JSON.parse(JSON.stringify(screen)) as Screen;
        newScreen.id = newSlug;
        newScreen.name = `${screen.name} (copy)`;
        newScreen.position = { x: screen.position.x + 300, y: screen.position.y };
        newScreen.order = newOrder;
        draft.funnel.screens[newSlug] = newScreen;

        const idMap = new Map<string, string>();
        for (const el of screenElements) {
          idMap.set(el.id, `${el.type}-${nanoid(8)}`);
        }
        for (const el of screenElements) {
          const copy = JSON.parse(JSON.stringify(el)) as FunnelElement;
          copy.id = idMap.get(el.id)!;
          copy.screenId = newSlug;
          if (copy.parentId && idMap.has(copy.parentId)) {
            copy.parentId = idMap.get(copy.parentId)!;
          }
          draft.funnel.elements[copy.id] = copy;
        }
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
        const toDelete = [elementId];
        for (let i = 0; i < toDelete.length; i++) {
          for (const e of Object.values(draft.funnel.elements)) {
            if (e.parentId === toDelete[i] && !toDelete.includes(e.id)) {
              toDelete.push(e.id);
            }
          }
        }
        for (const id of toDelete) delete draft.funnel.elements[id];
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

    reorderElements: (screenId, orderedIds) =>
      undoableUpdate('ELEMENT_REORDER', (draft) => {
        orderedIds.forEach((id, index) => {
          const el = draft.funnel.elements[id];
          if (el && el.screenId === screenId) el.order = index;
        });
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

    addBlock: (block) =>
      undoableUpdate('BLOCK_ADD', (draft) => {
        draft.funnel.blocks.push(block);
      }),

    deleteBlock: (blockId) =>
      undoableUpdate('BLOCK_DELETE', (draft) => {
        draft.funnel.blocks = draft.funnel.blocks.filter((b) => b.id !== blockId);
      }),

    updateBlock: (blockId, updates) =>
      undoableUpdate('BLOCK_UPDATE', (draft) => {
        const block = draft.funnel.blocks.find((b) => b.id === blockId);
        if (block) Object.assign(block, updates);
      }),
  };
};
