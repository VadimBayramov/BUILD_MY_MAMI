import { act } from 'react';
import ReactDOM from 'react-dom/client';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppShell } from './AppShell';
import { useFunnelStore } from '@store/funnel-store';

describe('AppShell layout', () => {
  beforeEach(() => {
    useFunnelStore.getState().createNewProject('Layout test');
    useFunnelStore.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        mode: 'map',
        leftPanelCollapsed: false,
        rightPanelCollapsed: false,
        leftPanelWidth: 280,
        rightPanelWidth: 320,
      },
    }));
  });

  test('renders panel resizers when both side panels are visible', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<AppShell />);
    });

    expect(container.querySelectorAll('[role="separator"]')).toHaveLength(2);

    root.unmount();
    container.remove();
  });

  test('resizes the left panel when dragging the resizer', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<AppShell />);
    });

    const leftPanel = container.querySelector('aside');
    const leftResizer = container.querySelector('[role="separator"]');

    expect(leftPanel?.getAttribute('style')).toContain('width: 280px');
    expect(leftResizer).not.toBeNull();

    await act(async () => {
      leftResizer!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100 }));
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 180 }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 180 }));
    });

    expect(container.querySelector('aside')?.getAttribute('style')).toContain('width: 360px');

    root.unmount();
    container.remove();
  });

  test('switches mode through header tabs', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<AppShell />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const managerButton = buttons.find((button) => button.textContent?.includes('Manager'));
    const developerButton = buttons.find((button) => button.textContent?.includes('Developer'));

    expect(useFunnelStore.getState().ui.mode).toBe('map');

    await act(async () => {
      managerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(useFunnelStore.getState().ui.mode).toBe('manager');

    await act(async () => {
      developerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(useFunnelStore.getState().ui.mode).toBe('developer');

    root.unmount();
    container.remove();
  });
});
