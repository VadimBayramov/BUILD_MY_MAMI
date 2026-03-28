import { create } from 'zustand';
import { enablePatches } from 'immer';
import type { FunnelStore } from '@typedefs/store';
import { createFunnelSlice, buildElementIndexes } from './slices/funnel-slice';
import { createUISlice, defaultUI } from './slices/ui-slice';
import { createHistorySlice, defaultHistory } from './slices/history-slice';
import { createDefaultProject } from './defaults';
import { invalidateScreenCache, invalidateAllCache } from '@services/html-cache';

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

// ── Cache invalidation subscriber ────────────────────────────────────────────
// Watches for funnel mutations and drops stale HTML cache entries.
// Runs outside React so it's always active regardless of mounted components.

useFunnelStore.subscribe((state, prev) => {
  const next = state.project.funnel;
  const old = prev.project.funnel;
  if (next === old) return;

  // globalStyles change → every screen's HTML must be regenerated
  if (next.globalStyles !== old.globalStyles) {
    invalidateAllCache();
    return;
  }

  const dirty = new Set<string>();

  // Screens whose settings changed directly
  for (const [id, screen] of Object.entries(next.screens)) {
    if (screen !== old.screens[id]) dirty.add(id);
  }

  // Elements that changed — invalidate the screen they belong to
  for (const [id, el] of Object.entries(next.elements)) {
    if (el !== old.elements[id]) dirty.add(el.screenId);
  }
  // Elements that were deleted — use the old element's screenId
  for (const [id, el] of Object.entries(old.elements)) {
    if (!next.elements[id]) dirty.add(el.screenId);
  }

  for (const screenId of dirty) invalidateScreenCache(screenId);
});
