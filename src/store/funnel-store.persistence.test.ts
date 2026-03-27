import { beforeEach, describe, expect, test } from 'vitest';
import 'fake-indexeddb/auto';
import { createDefaultScreen } from './defaults';
import { useFunnelStore } from './funnel-store';
import { builderDb, setLastOpenedProjectId } from './middleware/persist';

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

describe('funnel store persistence', () => {
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
    useFunnelStore.getState().createNewProject('Persistence test');
  });

  test('saves project to persistence and loads it back by id', async () => {
    const store = useFunnelStore.getState();
    const projectId = store.project.id;

    store.addScreen(createDefaultScreen('saved-screen', 'Saved Screen', 'survey', { x: 400, y: 0 }, 1));
    await store.saveProject();

    store.deleteScreen('saved-screen');
    expect(useFunnelStore.getState().project.funnel.screens['saved-screen']).toBeUndefined();

    await useFunnelStore.getState().loadProject(projectId);

    expect(useFunnelStore.getState().project.funnel.screens['saved-screen']).toBeDefined();
  });

  test('loads the last opened project id from localStorage-friendly metadata', async () => {
    const store = useFunnelStore.getState();

    await store.saveProject();

    setLastOpenedProjectId(store.project.id);

    expect(window.localStorage.getItem('funnel-builder:last-opened-project')).toBe(store.project.id);
  });

  test('updates project timestamp when funnel state changes', () => {
    const before = useFunnelStore.getState().project.updatedAt;

    useFunnelStore
      .getState()
      .addScreen(createDefaultScreen('timestamp-screen', 'Timestamp Screen', 'survey', { x: 800, y: 0 }, 1));

    const after = useFunnelStore.getState().project.updatedAt;

    expect(after).not.toBe(before);
  });
});
