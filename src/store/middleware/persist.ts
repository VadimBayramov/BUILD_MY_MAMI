import Dexie, { type Table } from 'dexie';
import type { AssetReference, ProjectDocument } from '@typedefs/project';

const UI_PREFS_KEY = 'funnel-builder-ui';
const LAST_OPENED_PROJECT_KEY = 'funnel-builder:last-opened-project';

type AssetRecord = AssetReference & {
  projectId?: string;
};

type HistoryRecord = {
  id?: number;
  projectId: string;
  timestamp: number;
  payload: unknown;
};

class FunnelBuilderDatabase extends Dexie {
  projects!: Table<ProjectDocument, string>;
  assets!: Table<AssetRecord, string>;
  history!: Table<HistoryRecord, number>;

  constructor() {
    super('funnel-builder');

    this.version(1).stores({
      projects: 'id, updatedAt, createdAt',
      assets: 'id, hash, filename, projectId',
      history: '++id, projectId, timestamp',
    });
  }
}

export const builderDb = new FunnelBuilderDatabase();

export function loadUIPrefs(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function saveUIPrefs(prefs: Record<string, unknown>): void {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore unavailable or full localStorage in dev/test.
  }
}

export function getLastOpenedProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_OPENED_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setLastOpenedProjectId(projectId: string): void {
  try {
    localStorage.setItem(LAST_OPENED_PROJECT_KEY, projectId);
  } catch {
    // Ignore unavailable localStorage in dev/test.
  }
}

export function clearLastOpenedProjectId(): void {
  try {
    localStorage.removeItem(LAST_OPENED_PROJECT_KEY);
  } catch {
    // Ignore unavailable localStorage in dev/test.
  }
}
