import { applyPatches } from 'immer';
import { nanoid } from 'nanoid';
import type { StateCreator } from 'zustand';
import type { HistoryActions, ClipboardActions, ProjectActions } from '@typedefs/store';
import type { HistoryState } from '@typedefs/ui';
import type { ProjectDocument } from '@typedefs/project';
import type { Connection, ElementIndexes } from '@typedefs/funnel';
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
  },

  cut: () => {
    const state = get();
    const { selectedScreenIds } = state.ui;
    if (selectedScreenIds.length === 0) return;

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
  },

  paste: () => {
    const state = get();
    const { clipboard, selectedScreenIds, linkMode } = state.ui;
    if (!clipboard || clipboard.type !== 'screen') return;

    const sourceId = clipboard.screen.id;
    const sourceExists = !!state.project.funnel.screens[sourceId];
    const insertAfterId = selectedScreenIds.length > 0 ? selectedScreenIds[selectedScreenIds.length - 1]! : null;
    let newId: string | null = null;

    if (sourceExists) {
      const newSlug = state.duplicateScreen(sourceId);
      if (newSlug) {
        newId = newSlug;
        if (linkMode) {
          const anchorId = insertAfterId ?? sourceId;
          insertIntoChain(get(), anchorId, newSlug);
        }
      }
    } else {
      const screen = JSON.parse(JSON.stringify(clipboard.screen));
      screen.position = { x: screen.position.x + 300, y: screen.position.y };
      state.addScreen(screen);
      for (const el of clipboard.elements) {
        state.addElement(JSON.parse(JSON.stringify(el)));
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
      const newSlug = state.duplicateScreen(id);
      if (newSlug) {
        newIds.push(newSlug);
        if (linkMode) {
          insertIntoChain(get(), id, newSlug);
        }
      }
    } else {
      let prevSlug: string | null = null;
      for (const id of selectedScreenIds) {
        const newSlug = state.duplicateScreen(id);
        if (newSlug) {
          newIds.push(newSlug);
          if (linkMode) {
            const linkFrom = prevSlug ?? id;
            addLink(get(), linkFrom, newSlug);
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
