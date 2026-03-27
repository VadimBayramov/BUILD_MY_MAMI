import { applyPatches } from 'immer';
import type { StateCreator } from 'zustand';
import type { HistoryActions, ClipboardActions, ProjectActions } from '@typedefs/store';
import type { HistoryState } from '@typedefs/ui';
import type { ProjectDocument } from '@typedefs/project';
import type { ElementIndexes } from '@typedefs/funnel';
import { buildElementIndexes } from './funnel-slice';
import { createDefaultProject } from '../defaults';
import { defaultUI } from './ui-slice';

export interface HistorySlice extends HistoryActions, ClipboardActions, ProjectActions {
  history: HistoryState;
}

export const defaultHistory: HistoryState = {
  past: [],
  future: [],
  maxEntries: 100,
};

interface FullState {
  project: ProjectDocument;
  history: HistoryState;
  elementIndexes: ElementIndexes;
  ui: typeof defaultUI;
  duplicateScreen: (id: string) => string;
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

  copy: () => {},
  paste: () => {},
  duplicate: () => {
    const state = get();
    if (state.ui.selectedScreenIds.length > 0) {
      for (const id of state.ui.selectedScreenIds) {
        state.duplicateScreen(id);
      }
    }
  },

  saveProject: async () => {
    set((s) => ({
      project: { ...s.project, updatedAt: new Date().toISOString() },
    }));
  },

  loadProject: async (_projectId) => {},

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
