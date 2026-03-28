import { describe, expect, test, vi } from 'vitest';
import { createKeyboardShortcutHandler } from './useKeyboardShortcuts';

function createActions() {
  return {
    undo: vi.fn(),
    redo: vi.fn(),
    duplicate: vi.fn(),
    copy: vi.fn(),
    cut: vi.fn(),
    paste: vi.fn(),
    selectAll: vi.fn(),
    saveProject: vi.fn(async () => {}),
    setMode: vi.fn(),
    clearSelection: vi.fn(),
    toggleShortcutsModal: vi.fn(),
    toggleMapLock: vi.fn(),
    rename: vi.fn(),
    editId: vi.fn(),
    fitView: vi.fn(),
    autoLayout: vi.fn(),
    newScreen: vi.fn(),
    nextInChain: vi.fn(),
    prevInChain: vi.fn(),
    followDefault: vi.fn(),
    groupIntoBlock: vi.fn(),
    toggleFocusedScreenMode: vi.fn(),
    openSearch: vi.fn(),
    goToStart: vi.fn(),
    goToEnd: vi.fn(),
  };
}

describe('createKeyboardShortcutHandler', () => {
  test('handles undo, redo and save shortcuts', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));

    expect(actions.undo).toHaveBeenCalledTimes(1);
    expect(actions.redo).toHaveBeenCalledTimes(2);
    expect(actions.saveProject).toHaveBeenCalledTimes(1);
  });

  test('handles copy, cut, paste and duplicate shortcuts', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'x', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }));

    expect(actions.copy).toHaveBeenCalledTimes(1);
    expect(actions.cut).toHaveBeenCalledTimes(1);
    expect(actions.paste).toHaveBeenCalledTimes(1);
    expect(actions.duplicate).toHaveBeenCalledTimes(1);
  });

  test('Ctrl+A selects all', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));

    expect(actions.selectAll).toHaveBeenCalledTimes(1);
  });

  test('switches modes and clears selection', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: '1' }));
    handleKeyDown(new KeyboardEvent('keydown', { key: '2' }));
    handleKeyDown(new KeyboardEvent('keydown', { key: '3' }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(actions.setMode).toHaveBeenNthCalledWith(1, 'map');
    expect(actions.setMode).toHaveBeenNthCalledWith(2, 'manager');
    expect(actions.setMode).toHaveBeenNthCalledWith(3, 'developer');
    expect(actions.clearSelection).toHaveBeenCalledTimes(1);
  });

  test('Ctrl+K toggles shortcuts modal', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

    expect(actions.toggleShortcutsModal).toHaveBeenCalledTimes(1);
  });

  test('Ctrl+K works in editable fields', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);
    const input = document.createElement('input');

    handleKeyDown(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      input,
    );

    expect(actions.toggleShortcutsModal).toHaveBeenCalledTimes(1);
  });

  test('ignores app shortcuts in editable fields but allows save and shortcuts modal', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);
    const input = document.createElement('input');

    handleKeyDown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }), input);
    handleKeyDown(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }), input);
    handleKeyDown(new KeyboardEvent('keydown', { key: 'x', ctrlKey: true, bubbles: true }), input);
    handleKeyDown(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }), input);
    handleKeyDown(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }), input);
    handleKeyDown(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }), input);

    expect(actions.undo).not.toHaveBeenCalled();
    expect(actions.copy).not.toHaveBeenCalled();
    expect(actions.cut).not.toHaveBeenCalled();
    expect(actions.paste).not.toHaveBeenCalled();
    expect(actions.selectAll).not.toHaveBeenCalled();
    expect(actions.saveProject).toHaveBeenCalledTimes(1);
  });

  test('handles shortcuts by physical key when non latin layout is active', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'я', code: 'KeyZ', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'ы', code: 'KeyS', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'в', code: 'KeyD', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'с', code: 'KeyC', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'ч', code: 'KeyX', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'м', code: 'KeyV', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'л', code: 'KeyK', ctrlKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'ф', code: 'KeyA', ctrlKey: true }));

    expect(actions.undo).toHaveBeenCalledTimes(1);
    expect(actions.saveProject).toHaveBeenCalledTimes(1);
    expect(actions.duplicate).toHaveBeenCalledTimes(1);
    expect(actions.copy).toHaveBeenCalledTimes(1);
    expect(actions.cut).toHaveBeenCalledTimes(1);
    expect(actions.paste).toHaveBeenCalledTimes(1);
    expect(actions.toggleShortcutsModal).toHaveBeenCalledTimes(1);
    expect(actions.selectAll).toHaveBeenCalledTimes(1);
  });

  test('F2 triggers rename', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'F2' }));

    expect(actions.rename).toHaveBeenCalledTimes(1);
  });

  test('F2 does not trigger rename inside editable fields', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);
    const input = document.createElement('input');

    handleKeyDown(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }), input);

    expect(actions.rename).not.toHaveBeenCalled();
  });

  test('F3 triggers editId', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'F3' }));

    expect(actions.editId).toHaveBeenCalledTimes(1);
  });

  test('F3 does not trigger editId inside editable fields', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);
    const input = document.createElement('input');

    handleKeyDown(new KeyboardEvent('keydown', { key: 'F3', bubbles: true }), input);

    expect(actions.editId).not.toHaveBeenCalled();
  });

  test('Ctrl+Shift+L triggers autoLayout', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, shiftKey: true }));

    expect(actions.autoLayout).toHaveBeenCalledTimes(1);
  });

  test('Ctrl+Shift+1 triggers fitView', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: '1', ctrlKey: true, shiftKey: true }));

    expect(actions.fitView).toHaveBeenCalledTimes(1);
  });

  test('metaKey (macOS Cmd) works the same as ctrlKey', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'z', metaKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'c', metaKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'x', metaKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'v', metaKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 'a', metaKey: true }));
    handleKeyDown(new KeyboardEvent('keydown', { key: 's', metaKey: true }));

    expect(actions.undo).toHaveBeenCalledTimes(1);
    expect(actions.copy).toHaveBeenCalledTimes(1);
    expect(actions.cut).toHaveBeenCalledTimes(1);
    expect(actions.paste).toHaveBeenCalledTimes(1);
    expect(actions.selectAll).toHaveBeenCalledTimes(1);
    expect(actions.saveProject).toHaveBeenCalledTimes(1);
  });

  test('Ctrl+N triggers newScreen', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true }));

    expect(actions.newScreen).toHaveBeenCalledTimes(1);
  });

  test('Tab triggers nextInChain', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }));

    expect(actions.nextInChain).toHaveBeenCalledTimes(1);
  });

  test('Shift+Tab triggers prevInChain', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));

    expect(actions.prevInChain).toHaveBeenCalledTimes(1);
  });

  test('Ctrl+Enter triggers followDefault', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));

    expect(actions.followDefault).toHaveBeenCalledTimes(1);
  });

  test('Ctrl+B triggers groupIntoBlock', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));

    expect(actions.groupIntoBlock).toHaveBeenCalledTimes(1);
  });

  test('Space triggers toggleFocusedScreenMode', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: ' ' }));

    expect(actions.toggleFocusedScreenMode).toHaveBeenCalledTimes(1);
  });

  test('Space shortcut also works when browser reports the physical Space code', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'Space', code: 'Space' }));

    expect(actions.toggleFocusedScreenMode).toHaveBeenCalledTimes(1);
  });

  test('Ctrl+Shift+F triggers openSearch', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, shiftKey: true }));

    expect(actions.openSearch).toHaveBeenCalledTimes(1);
  });

  test('Ctrl+Shift+F works in editable fields', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);
    const input = document.createElement('input');

    handleKeyDown(
      new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, shiftKey: true, bubbles: true }),
      input,
    );

    expect(actions.openSearch).toHaveBeenCalledTimes(1);
  });

  test('Home triggers goToStart', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'Home' }));

    expect(actions.goToStart).toHaveBeenCalledTimes(1);
  });

  test('End triggers goToEnd', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);

    handleKeyDown(new KeyboardEvent('keydown', { key: 'End' }));

    expect(actions.goToEnd).toHaveBeenCalledTimes(1);
  });

  test('Tab/Space/Home/End do not trigger in editable fields', () => {
    const actions = createActions();
    const handleKeyDown = createKeyboardShortcutHandler(actions);
    const input = document.createElement('input');

    handleKeyDown(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }), input);
    handleKeyDown(new KeyboardEvent('keydown', { key: ' ', bubbles: true }), input);
    handleKeyDown(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }), input);
    handleKeyDown(new KeyboardEvent('keydown', { key: 'End', bubbles: true }), input);

    expect(actions.nextInChain).not.toHaveBeenCalled();
    expect(actions.toggleFocusedScreenMode).not.toHaveBeenCalled();
    expect(actions.goToStart).not.toHaveBeenCalled();
    expect(actions.goToEnd).not.toHaveBeenCalled();
  });

  test('run returning false does not prevent default', () => {
    const actions = createActions();
    actions.nextInChain.mockReturnValue(false);
    const handleKeyDown = createKeyboardShortcutHandler(actions);
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');

    handleKeyDown(event);

    expect(actions.nextInChain).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
  });
});
