import type { StateCreator } from 'zustand';
import type { UIActions } from '@typedefs/store';
import type { UIState } from '@typedefs/ui';
import type { ProjectDocument } from '@typedefs/project';
import { loadUIPrefs, saveUIPrefs } from '../middleware/persist';

export interface UISlice extends UIActions {
  ui: UIState;
  project: ProjectDocument;
}

const baseUI: UIState = {
  mode: 'map',
  selectedScreenIds: [],
  selectedElementIds: [],
  draggedItem: null,
  clipboard: null,
  linkMode: false,
  mapLocked: false,
  leftPanelWidth: 280,
  rightPanelWidth: 320,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  mapPan: { x: 0, y: 0 },
  mapScale: 1,
  gridSnap: true,
  showMinimap: true,
  showConnections: true,
  previewVisible: false,
  previewDevice: 'mobile',
  previewLocale: 'en',
  managerTab: 'preview',
  renameFocusId: null,
  idFocusId: null,
  mapTool: 'cursor',
};

function buildPersistedUIState(): UIState {
  const prefs = loadUIPrefs();

  return {
    ...baseUI,
    ...(prefs ?? {}),
  } as UIState;
}

function persistUIPrefs(ui: UIState) {
  saveUIPrefs({
    leftPanelWidth: ui.leftPanelWidth,
    rightPanelWidth: ui.rightPanelWidth,
    leftPanelCollapsed: ui.leftPanelCollapsed,
    rightPanelCollapsed: ui.rightPanelCollapsed,
  });
}

export const defaultUI: UIState = buildPersistedUIState();

export const createUISlice: StateCreator<UISlice, [], [], UIActions> = (set, get) => ({
  setMode: (mode) => set((s) => ({ ui: { ...s.ui, mode } })),

  selectScreen: (screenId, multi) =>
    set((s) => ({
      ui: {
        ...s.ui,
        selectedScreenIds: multi
          ? s.ui.selectedScreenIds.includes(screenId)
            ? s.ui.selectedScreenIds.filter((id) => id !== screenId)
            : [...s.ui.selectedScreenIds, screenId]
          : [screenId],
        selectedElementIds: [],
      },
    })),

  selectElement: (elementId, multi) =>
    set((s) => ({
      ui: {
        ...s.ui,
        selectedElementIds: multi
          ? s.ui.selectedElementIds.includes(elementId)
            ? s.ui.selectedElementIds.filter((id) => id !== elementId)
            : [...s.ui.selectedElementIds, elementId]
          : [elementId],
      },
    })),

  selectAllScreens: () => {
    const state = get();
    set({
      ui: {
        ...state.ui,
        selectedScreenIds: Object.keys(state.project.funnel.screens),
        selectedElementIds: [],
      },
    });
  },

  clearSelection: () =>
    set((s) => ({
      ui: { ...s.ui, selectedScreenIds: [], selectedElementIds: [] },
    })),

  setLinkMode: (enabled) =>
    set((s) => ({ ui: { ...s.ui, linkMode: enabled } })),

  setMapLocked: (locked) =>
    set((s) => ({ ui: { ...s.ui, mapLocked: locked } })),

  updatePan: (pan) => set((s) => ({ ui: { ...s.ui, mapPan: pan } })),
  updateScale: (scale) => set((s) => ({ ui: { ...s.ui, mapScale: scale } })),

  togglePanel: (side) =>
    set((s) => {
      const ui = {
        ...s.ui,
        ...(side === 'left'
          ? { leftPanelCollapsed: !s.ui.leftPanelCollapsed }
          : { rightPanelCollapsed: !s.ui.rightPanelCollapsed }),
      };

      persistUIPrefs(ui);

      return { ui };
    }),

  resizePanel: (side, width) =>
    set((s) => {
      const ui = {
        ...s.ui,
        ...(side === 'left' ? { leftPanelWidth: width } : { rightPanelWidth: width }),
      };

      persistUIPrefs(ui);

      return { ui };
    }),

  setPreviewVisible: (visible) =>
    set((s) => ({ ui: { ...s.ui, previewVisible: visible } })),

  setPreviewDevice: (device) =>
    set((s) => ({ ui: { ...s.ui, previewDevice: device } })),

  setGridSnap: (enabled) =>
    set((s) => ({ ui: { ...s.ui, gridSnap: enabled } })),

  setShowMinimap: (visible) =>
    set((s) => ({ ui: { ...s.ui, showMinimap: visible } })),

  triggerRename: (screenId) =>
    set((s) => ({ ui: { ...s.ui, renameFocusId: screenId } })),

  triggerIdFocus: (id) =>
    set((s) => ({ ui: { ...s.ui, idFocusId: id } })),

  setMapTool: (tool) =>
    set((s) => ({ ui: { ...s.ui, mapTool: tool } })),
});
