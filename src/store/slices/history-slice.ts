import { applyPatches } from 'immer';
import { nanoid } from 'nanoid';
import type { StateCreator } from 'zustand';
import type { HistoryActions, ClipboardActions, ProjectActions } from '@typedefs/store';
import type { HistoryState } from '@typedefs/ui';
import type { ProjectDocument } from '@typedefs/project';
import type { Connection, ElementIndexes, Screen } from '@typedefs/funnel';
import { buildElementIndexes } from './funnel-slice';
import { createDefaultProject } from '../defaults';
import { defaultUI } from './ui-slice';
import {
  loadProject as loadPersistedProject,
  saveProject as savePersistedProject,
} from '@services/storage-service';

export interface HistorySlice extends HistoryActions, ClipboardActions, ProjectActions {
  history: HistoryState;
}

const HISTORY_MAX_KEY = 'fb:maxHistoryEntries';

function loadMaxEntries(): number {
  try {
    const val = localStorage.getItem(HISTORY_MAX_KEY);
    if (val) {
      const n = Number(val);
      if (n >= 10 && n <= 500) return n;
    }
  } catch { /* ignore */ }
  return 50;
}

export const defaultHistory: HistoryState = {
  past: [],
  future: [],
  maxEntries: loadMaxEntries(),
};

interface FullState {
  project: ProjectDocument;
  history: HistoryState;
  elementIndexes: ElementIndexes;
  ui: typeof defaultUI;
  duplicateScreen: (id: string) => string;
  addScreen: (screen: import('@typedefs/funnel').Screen) => void;
  addElement: (element: import('@typedefs/funnel').FunnelElement) => void;
  addConnection: (connection: Connection) => void;
  addBlock: (block: import('@typedefs/funnel').Block) => void;
  deleteScreen: (id: string) => void;
  deleteScreens: (ids: string[]) => void;
  deleteConnection: (id: string) => void;
  updateScreen: (id: string, updates: Partial<import('@typedefs/funnel').Screen>) => void;
  batchMoveScreens: (positions: Record<string, { x: number; y: number }>) => void;
}

/** Returns the rightmost X position among all screens in the same copy-family as baseId */
function findFamilyMaxX(screens: Record<string, import('@typedefs/funnel').Screen>, baseId: string): number {
  const rootId = baseId.replace(/-copy(-\d+)?$/, '');
  const escaped = rootId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const familyRegex = new RegExp(`^${escaped}(-copy(-\\d+)?)?$`);
  let maxX = -Infinity;
  for (const s of Object.values(screens)) {
    if (familyRegex.test(s.id) && s.position.x > maxX) maxX = s.position.x;
  }
  return maxX === -Infinity ? 0 : maxX;
}

function addLink(state: FullState, from: string, to: string) {
  state.addConnection({
    id: `conn-${nanoid(8)}`,
    from,
    to,
    trigger: 'option-click',
    condition: null,
    label: '',
    priority: 0,
    isDefault: true,
  });
}

function insertIntoChain(state: FullState, afterId: string, newSlug: string) {
  const connections = state.project.funnel.connections;
  const outgoing = connections.filter((c) => c.from === afterId);

  if (outgoing.length === 1) {
    const old = outgoing[0]!;
    const oldTarget = old.to;
    state.addConnection({
      id: `conn-${nanoid(8)}`,
      from: afterId,
      to: newSlug,
      trigger: old.trigger,
      condition: null,
      label: '',
      priority: 0,
      isDefault: true,
    });
    state.addConnection({
      id: `conn-${nanoid(8)}`,
      from: newSlug,
      to: oldTarget,
      trigger: old.trigger,
      condition: null,
      label: '',
      priority: 0,
      isDefault: true,
    });
    state.deleteConnection(old.id);
  } else {
    addLink(state, afterId, newSlug);
  }
}

export const createHistorySlice: StateCreator<
  FullState,
  [],
  [],
  HistoryActions & ClipboardActions & ProjectActions
> = (set, get) => ({
  undo: () => {
    const state = get();
    const { past, future } = state.history;
    if (past.length === 0) return;
    const lastEntry = past[past.length - 1]!;
    const newProject = applyPatches(state.project, lastEntry.inversePatches);
    set({
      project: newProject,
      elementIndexes: buildElementIndexes(newProject.funnel.elements),
      history: {
        ...state.history,
        past: past.slice(0, -1),
        future: [lastEntry, ...future],
      },
    });
  },

  redo: () => {
    const state = get();
    const { past, future } = state.history;
    if (future.length === 0) return;
    const nextEntry = future[0]!;
    const newProject = applyPatches(state.project, nextEntry.patches);
    set({
      project: newProject,
      elementIndexes: buildElementIndexes(newProject.funnel.elements),
      history: {
        ...state.history,
        past: [...past, nextEntry],
        future: future.slice(1),
      },
    });
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  setMaxHistoryEntries: (max: number) => {
    const clamped = Math.max(10, Math.min(500, max));
    try { localStorage.setItem(HISTORY_MAX_KEY, String(clamped)); } catch { /* ignore */ }
    const state = get();
    set({
      history: {
        ...state.history,
        maxEntries: clamped,
        past: state.history.past.slice(-clamped),
      },
    });
  },

  copy: () => {
    const state = get();
    const { selectedScreenIds } = state.ui;
    if (selectedScreenIds.length === 0) return;

    if (selectedScreenIds.length === 1) {
      const screenId = selectedScreenIds[0]!;
      const screen = state.project.funnel.screens[screenId];
      if (!screen) return;
      const elements = Object.values(state.project.funnel.elements).filter(
        (el) => el.screenId === screenId,
      );
      set({
        ui: {
          ...state.ui,
          clipboard: {
            type: 'screen',
            screen: JSON.parse(JSON.stringify(screen)),
            elements: JSON.parse(JSON.stringify(elements)),
          },
        },
      });
    } else {
      const screens = selectedScreenIds
        .map((id) => state.project.funnel.screens[id])
        .filter(Boolean) as Screen[];
      if (screens.length === 0) return;
      const elements = Object.values(state.project.funnel.elements).filter(
        (el) => selectedScreenIds.includes(el.screenId),
      );
      set({
        ui: {
          ...state.ui,
          clipboard: {
            type: 'screens',
            screens: JSON.parse(JSON.stringify(screens)),
            elements: JSON.parse(JSON.stringify(elements)),
          },
        },
      });
    }
  },

  cut: () => {
    const state = get();
    const { selectedScreenIds } = state.ui;
    if (selectedScreenIds.length === 0) return;

    if (selectedScreenIds.length === 1) {
      const screenId = selectedScreenIds[0]!;
      const screen = state.project.funnel.screens[screenId];
      if (!screen) return;
      const elements = Object.values(state.project.funnel.elements).filter(
        (el) => el.screenId === screenId,
      );
      set({
        ui: {
          ...state.ui,
          clipboard: {
            type: 'screen',
            screen: JSON.parse(JSON.stringify(screen)),
            elements: JSON.parse(JSON.stringify(elements)),
          },
        },
      });
      state.deleteScreen(screenId);
    } else {
      const screens = selectedScreenIds
        .map((id) => state.project.funnel.screens[id])
        .filter(Boolean) as Screen[];
      if (screens.length === 0) return;
      const elements = Object.values(state.project.funnel.elements).filter(
        (el) => selectedScreenIds.includes(el.screenId),
      );
      set({
        ui: {
          ...state.ui,
          clipboard: {
            type: 'screens',
            screens: JSON.parse(JSON.stringify(screens)),
            elements: JSON.parse(JSON.stringify(elements)),
          },
        },
      });
      state.deleteScreens(selectedScreenIds);
    }
  },

  paste: () => {
    const state = get();
    const { clipboard, selectedScreenIds, linkMode } = state.ui;
    if (!clipboard) return;

    // ── Multi-screen paste ───────────────────────────────────────────────
    if (clipboard.type === 'screens') {
      const sortedScreens = [...clipboard.screens].sort((a, b) => a.order - b.order);

      // Place the pasted group to the right of all existing screens,
      // preserving relative positions within the group.
      const allCurrentScreens = get().project.funnel.screens;
      const currentMaxX = Object.keys(allCurrentScreens).length > 0
        ? Math.max(...Object.values(allCurrentScreens).map((s) => s.position.x))
        : -350;
      const clipboardMinX = sortedScreens.length > 0
        ? Math.min(...sortedScreens.map((s) => s.position.x))
        : 0;
      const xOffset = currentMaxX + 350 - clipboardMinX;

      const newIds: string[] = [];
      let prevSlug: string | null = null;

      for (const screen of sortedScreens) {
        const sourceExists = !!get().project.funnel.screens[screen.id];
        let newId: string;

        if (sourceExists) {
          const newSlug = get().duplicateScreen(screen.id);
          if (!newSlug) continue;
          // Reposition with the correct offset (duplicateScreen always uses original.x+300)
          get().updateScreen(newSlug, {
            position: { x: screen.position.x + xOffset, y: screen.position.y },
          });
          newId = newSlug;
        } else {
          const newScreen = JSON.parse(JSON.stringify(screen)) as Screen;
          newScreen.position = { x: screen.position.x + xOffset, y: screen.position.y };
          get().addScreen(newScreen);
          const screenEls = clipboard.elements.filter((el) => el.screenId === screen.id);
          for (const el of screenEls) {
            get().addElement(JSON.parse(JSON.stringify(el)));
          }
          newId = screen.id;
        }

        newIds.push(newId);
        // Multi-screen: only link copies to each other (self-contained chain).
        // Do NOT link originals → copies — that creates branching on the original chain.
        if (linkMode && prevSlug !== null) {
          addLink(get(), prevSlug, newId);
        }
        prevSlug = newId;
      }

      if (newIds.length > 0) {
        set({ ui: { ...get().ui, selectedScreenIds: newIds } });
      }
      return;
    }

    // ── Single-screen paste ──────────────────────────────────────────────
    if (clipboard.type !== 'screen') return;

    const sourceId = clipboard.screen.id;
    const sourceExists = !!get().project.funnel.screens[sourceId];
    const insertAfterId = selectedScreenIds.length > 0 ? selectedScreenIds[selectedScreenIds.length - 1]! : null;
    let newId: string | null = null;

    if (sourceExists) {
      // Place to the right of the entire copy-family, then push screens that
      // already occupy that spot further right to make room.
      const allScreens = get().project.funnel.screens;
      const familyMaxX = findFamilyMaxX(allScreens, sourceId);
      const targetX = familyMaxX + 300;

      // Shift screens occupying targetX or beyond
      const screensToShift: Record<string, { x: number; y: number }> = {};
      for (const [id, s] of Object.entries(allScreens)) {
        if (s.position.x >= targetX - 25) {
          screensToShift[id] = { x: s.position.x + 300, y: s.position.y };
        }
      }
      if (Object.keys(screensToShift).length > 0) {
        get().batchMoveScreens(screensToShift);
      }

      const newSlug = get().duplicateScreen(sourceId);
      if (newSlug) {
        newId = newSlug;
        get().updateScreen(newSlug, {
          position: { x: targetX, y: clipboard.screen.position.y },
        });
        if (linkMode) {
          const anchorId = insertAfterId ?? sourceId;
          insertIntoChain(get(), anchorId, newSlug);
        }
      }
    } else {
      const screen = JSON.parse(JSON.stringify(clipboard.screen)) as Screen;
      screen.position = { x: screen.position.x + 300, y: screen.position.y };
      get().addScreen(screen);
      for (const el of clipboard.elements) {
        get().addElement(JSON.parse(JSON.stringify(el)));
      }
      newId = screen.id;
      if (linkMode && insertAfterId) {
        insertIntoChain(get(), insertAfterId, screen.id);
      }
    }

    if (newId) {
      set({ ui: { ...get().ui, selectedScreenIds: [newId] } });
    }
  },

  duplicate: () => {
    const state = get();
    const { selectedScreenIds, linkMode } = state.ui;
    if (selectedScreenIds.length === 0) return;

    const newIds: string[] = [];

    if (selectedScreenIds.length === 1) {
      const id = selectedScreenIds[0]!;
      const srcScreen = get().project.funnel.screens[id];
      if (!srcScreen) return;

      // Find rightmost copy in family and push screens at targetX right
      const allScreens = get().project.funnel.screens;
      const familyMaxX = findFamilyMaxX(allScreens, id);
      const targetX = familyMaxX + 300;

      const screensToShift: Record<string, { x: number; y: number }> = {};
      for (const [sid, s] of Object.entries(allScreens)) {
        if (s.position.x >= targetX - 25) {
          screensToShift[sid] = { x: s.position.x + 300, y: s.position.y };
        }
      }
      if (Object.keys(screensToShift).length > 0) {
        get().batchMoveScreens(screensToShift);
      }

      const newSlug = get().duplicateScreen(id);
      if (newSlug) {
        get().updateScreen(newSlug, { position: { x: targetX, y: srcScreen.position.y } });
        newIds.push(newSlug);
        if (linkMode) {
          insertIntoChain(get(), id, newSlug);
        }
      }
    } else {
      // Multi-select duplicate: place group to the right of all existing screens
      const allCurrentScreens = get().project.funnel.screens;
      const currentMaxX = Object.keys(allCurrentScreens).length > 0
        ? Math.max(...Object.values(allCurrentScreens).map((s) => s.position.x))
        : -350;
      const srcScreens = selectedScreenIds
        .map((id) => allCurrentScreens[id])
        .filter(Boolean) as Screen[];
      const srcMinX = srcScreens.length > 0
        ? Math.min(...srcScreens.map((s) => s.position.x))
        : 0;
      const xOffset = currentMaxX + 350 - srcMinX;

      let prevSlug: string | null = null;
      for (const id of selectedScreenIds) {
        const srcScreen = get().project.funnel.screens[id];
        const newSlug = get().duplicateScreen(id);
        if (newSlug && srcScreen) {
          get().updateScreen(newSlug, {
            position: { x: srcScreen.position.x + xOffset, y: srcScreen.position.y },
          });
          newIds.push(newSlug);
          // Multi-screen: only link copies to each other — don't link original → copy,
          // that would add a second outgoing from the original and create branching.
          if (linkMode && prevSlug !== null) {
            addLink(get(), prevSlug, newSlug);
          }
          prevSlug = newSlug;
        }
      }
    }

    if (newIds.length > 0) {
      set({ ui: { ...get().ui, selectedScreenIds: newIds } });
    }
  },

  saveProject: async () => {
    const nextProject = {
      ...get().project,
      updatedAt: new Date().toISOString(),
    };

    set({ project: nextProject });
    await savePersistedProject(nextProject);
  },

  loadProject: async (projectId) => {
    const project = await loadPersistedProject(projectId);
    if (!project) return;

    if (!project.funnel.blocks) project.funnel.blocks = [];

    set({
      project,
      ui: defaultUI,
      history: defaultHistory,
      elementIndexes: buildElementIndexes(project.funnel.elements),
    });
  },

  createNewProject: (name) => {
    const project = createDefaultProject();
    if (name) project.funnel.meta.name = name;
    set({
      project,
      ui: defaultUI,
      history: defaultHistory,
      elementIndexes: buildElementIndexes(project.funnel.elements),
    });
  },

  exportHtmlZip: async () => new Blob(),
  exportSingleFile: () => '',
});
