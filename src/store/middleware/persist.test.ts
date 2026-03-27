import { beforeEach, describe, expect, test } from 'vitest';
import 'fake-indexeddb/auto';
import {
  builderDb,
  getLastOpenedProjectId,
  loadUIPrefs,
  saveUIPrefs,
  setLastOpenedProjectId,
} from './persist';

function createStorageMock(): Storage {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key) {
      return storage.get(key) ?? null;
    },
    key(index) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key) {
      storage.delete(key);
    },
    setItem(key, value) {
      storage.set(key, value);
    },
  };
}

describe('persist middleware', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'localStorage', {
      value: createStorageMock(),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: window.localStorage,
      configurable: true,
    });
    await builderDb.delete();
    await builderDb.open();
  });

  test('stores ui prefs in localStorage only', () => {
    saveUIPrefs({ leftPanelWidth: 300, rightPanelWidth: 360 });

    expect(loadUIPrefs()).toEqual({
      leftPanelWidth: 300,
      rightPanelWidth: 360,
    });
  });

  test('tracks last opened project separately from project data', () => {
    expect(getLastOpenedProjectId()).toBeNull();

    setLastOpenedProjectId('project-123');

    expect(getLastOpenedProjectId()).toBe('project-123');
    expect(window.localStorage.getItem('funnel-builder-ui')).toBeNull();
  });
});
