import type { StateCreator } from 'zustand';
import type { UIActions } from '@typedefs/store';
import type { UIState } from '@typedefs/ui';

export interface UISlice extends UIActions {
  ui: UIState;
}

export const defaultUI: UIState = {
  mode: 'map',
  selectedScreenIds: [],
  selectedElementIds: [],
  draggedItem: null,
  clipboard: null,
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
};

export const createUISlice: StateCreator<UISlice, [], [], UIActions> = (set) => ({
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

  clearSelection: () =>
    set((s) => ({
      ui: { ...s.ui, selectedScreenIds: [], selectedElementIds: [] },
    })),

  updatePan: (pan) => set((s) => ({ ui: { ...s.ui, mapPan: pan } })),
  updateScale: (scale) => set((s) => ({ ui: { ...s.ui, mapScale: scale } })),

  togglePanel: (side) =>
    set((s) => ({
      ui: {
        ...s.ui,
        ...(side === 'left'
          ? { leftPanelCollapsed: !s.ui.leftPanelCollapsed }
          : { rightPanelCollapsed: !s.ui.rightPanelCollapsed }),
      },
    })),

  resizePanel: (side, width) =>
    set((s) => ({
      ui: {
        ...s.ui,
        ...(side === 'left' ? { leftPanelWidth: width } : { rightPanelWidth: width }),
      },
    })),

  setPreviewVisible: (visible) =>
    set((s) => ({ ui: { ...s.ui, previewVisible: visible } })),

  setPreviewDevice: (device) =>
    set((s) => ({ ui: { ...s.ui, previewDevice: device } })),

  setGridSnap: (enabled) =>
    set((s) => ({ ui: { ...s.ui, gridSnap: enabled } })),

  setShowMinimap: (visible) =>
    set((s) => ({ ui: { ...s.ui, showMinimap: visible } })),
});
