import { create } from 'zustand';
import { enablePatches } from 'immer';
import type { FunnelStore } from '@typedefs/store';
import { createFunnelSlice, buildElementIndexes } from './slices/funnel-slice';
import { createUISlice, defaultUI } from './slices/ui-slice';
import { createHistorySlice, defaultHistory } from './slices/history-slice';
import { createDefaultProject } from './defaults';

enablePatches();

const initialProject = createDefaultProject();

export const useFunnelStore = create<FunnelStore>()((set, get, api) => ({
  project: initialProject,
  ui: defaultUI,
  history: defaultHistory,
  elementIndexes: buildElementIndexes(initialProject.funnel.elements),

  ...createFunnelSlice(set, get, api),
  ...createUISlice(set, get, api),
  ...createHistorySlice(set, get, api),
}));
