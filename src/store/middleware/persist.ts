/**
 * IndexedDB persistence via Dexie.js for ProjectDocument.
 * localStorage only for UI preferences (panel sizes, theme).
 *
 * Will be wired into funnel-store via Zustand middleware in Phase 2.
 */

const UI_PREFS_KEY = 'funnel-builder-ui';

export function loadUIPrefs(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUIPrefs(prefs: Record<string, unknown>): void {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // quota exceeded — silently ignore
  }
}
