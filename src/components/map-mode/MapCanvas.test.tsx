import { act } from 'react';
import ReactDOM from 'react-dom/client';
import { beforeEach, describe, expect, test } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { createDefaultScreen } from '@store/defaults';
import { useFunnelStore } from '@store/funnel-store';
import { MapCanvas } from './MapCanvas';

function WrappedMapCanvas() {
  return (
    <DndContext>
      <MapCanvas />
    </DndContext>
  );
}

describe('MapCanvas', () => {
  beforeEach(() => {
    useFunnelStore.getState().createNewProject('Map canvas test');
    useFunnelStore.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        mode: 'map',
        selectedScreenIds: [],
        showMinimap: true,
        gridSnap: true,
      },
    }));
  });

  test('syncs rendered nodes when screens are added to the store', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<WrappedMapCanvas />);
    });

    expect(container.textContent).toContain('Welcome');

    await act(async () => {
      useFunnelStore
        .getState()
        .addScreen(createDefaultScreen('second-screen', 'Second Screen', 'survey', { x: 400, y: 0 }, 1));
    });

    expect(container.textContent).toContain('Second Screen');

    root.unmount();
    container.remove();
  });

  test('deletes selected screens on Delete key press', async () => {
    useFunnelStore
      .getState()
      .addScreen(createDefaultScreen('delete-me', 'Delete Me', 'survey', { x: 400, y: 0 }, 1));

    useFunnelStore.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        selectedScreenIds: ['delete-me'],
      },
    }));

    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<WrappedMapCanvas />);
    });

    const canvas = container.querySelector('[tabindex="0"]');
    expect(canvas).not.toBeNull();

    await act(async () => {
      canvas!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Delete' }));
    });

    expect(useFunnelStore.getState().project.funnel.screens['delete-me']).toBeUndefined();

    root.unmount();
    container.remove();
  });

  test('reflects selected screens from the store in rendered nodes', async () => {
    useFunnelStore
      .getState()
      .addScreen(createDefaultScreen('selected-screen', 'Selected Screen', 'survey', { x: 400, y: 0 }, 1));

    useFunnelStore.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        selectedScreenIds: ['selected-screen'],
      },
    }));

    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<WrappedMapCanvas />);
    });

    expect(container.querySelector('button[title="Duplicate"]')).not.toBeNull();
    expect(container.querySelector('button[title="Delete"]')).not.toBeNull();

    root.unmount();
    container.remove();
  });

  test('renders minimap and connection handles for mapped screens', async () => {
    useFunnelStore
      .getState()
      .addScreen(createDefaultScreen('screen-b', 'Screen B', 'survey', { x: 400, y: 0 }, 1));

    useFunnelStore.getState().addConnection({
      id: 'conn-1',
      from: 'welcome',
      to: 'screen-b',
      trigger: 'option-click',
      condition: null,
      label: '',
      priority: 0,
      isDefault: true,
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<WrappedMapCanvas />);
    });

    expect(container.textContent).toContain('Mini Map');
    expect(container.querySelectorAll('.react-flow__handle').length).toBeGreaterThan(0);

    root.unmount();
    container.remove();
  });
});
