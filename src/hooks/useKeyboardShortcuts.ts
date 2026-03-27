import { useEffect, useState, useCallback } from 'react';
import { useFunnelStore } from '@store/funnel-store';
import type { Mode } from '@typedefs/ui';

type ShortcutActions = {
  undo: () => void;
  redo: () => void;
  duplicate: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  selectAll: () => void;
  saveProject: () => Promise<void>;
  setMode: (mode: Mode) => void;
  clearSelection: () => void;
  toggleShortcutsModal: () => void;
};

export type ShortcutDefinition = {
  id: string;
  label: string;
  keys: string;
  allowInEditable?: boolean;
  matches: (event: KeyboardEvent) => boolean;
  run: (actions: ShortcutActions) => void;
};

function mod(event: KeyboardEvent) {
  return event.ctrlKey || event.metaKey;
}

function matchesKey(event: KeyboardEvent, code: string, key: string) {
  return event.code === code || event.key.toLowerCase() === key;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export const SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'undo',
    label: 'Отменить',
    keys: 'Ctrl+Z',
    matches: (e) => mod(e) && !e.shiftKey && matchesKey(e, 'KeyZ', 'z'),
    run: (a) => a.undo(),
  },
  {
    id: 'redo',
    label: 'Повторить',
    keys: 'Ctrl+Shift+Z',
    matches: (e) => mod(e) && e.shiftKey && matchesKey(e, 'KeyZ', 'z'),
    run: (a) => a.redo(),
  },
  {
    id: 'redo-y',
    label: 'Повторить',
    keys: 'Ctrl+Y',
    matches: (e) => mod(e) && matchesKey(e, 'KeyY', 'y'),
    run: (a) => a.redo(),
  },
  {
    id: 'save',
    label: 'Сохранить',
    keys: 'Ctrl+S',
    allowInEditable: true,
    matches: (e) => mod(e) && matchesKey(e, 'KeyS', 's'),
    run: (a) => { void a.saveProject(); },
  },
  {
    id: 'copy',
    label: 'Копировать',
    keys: 'Ctrl+C',
    matches: (e) => mod(e) && matchesKey(e, 'KeyC', 'c'),
    run: (a) => a.copy(),
  },
  {
    id: 'paste',
    label: 'Вставить',
    keys: 'Ctrl+V',
    matches: (e) => mod(e) && matchesKey(e, 'KeyV', 'v'),
    run: (a) => a.paste(),
  },
  {
    id: 'cut',
    label: 'Вырезать',
    keys: 'Ctrl+X',
    matches: (e) => mod(e) && matchesKey(e, 'KeyX', 'x'),
    run: (a) => a.cut(),
  },
  {
    id: 'duplicate',
    label: 'Дублировать',
    keys: 'Ctrl+D',
    matches: (e) => mod(e) && matchesKey(e, 'KeyD', 'd'),
    run: (a) => a.duplicate(),
  },
  {
    id: 'select-all',
    label: 'Выделить всё',
    keys: 'Ctrl+A',
    matches: (e) => mod(e) && matchesKey(e, 'KeyA', 'a'),
    run: (a) => a.selectAll(),
  },
  {
    id: 'shortcuts-modal',
    label: 'Горячие клавиши',
    keys: 'Ctrl+K',
    allowInEditable: true,
    matches: (e) => mod(e) && matchesKey(e, 'KeyK', 'k'),
    run: (a) => a.toggleShortcutsModal(),
  },
  {
    id: 'mode-map',
    label: 'Режим: Карта',
    keys: '1',
    matches: (e) => !mod(e) && !e.altKey && e.key === '1',
    run: (a) => a.setMode('map'),
  },
  {
    id: 'mode-manager',
    label: 'Режим: Менеджер',
    keys: '2',
    matches: (e) => !mod(e) && !e.altKey && e.key === '2',
    run: (a) => a.setMode('manager'),
  },
  {
    id: 'mode-developer',
    label: 'Режим: Разработка',
    keys: '3',
    matches: (e) => !mod(e) && !e.altKey && e.key === '3',
    run: (a) => a.setMode('developer'),
  },
  {
    id: 'clear-selection',
    label: 'Снять выделение',
    keys: 'Escape',
    matches: (e) => e.key === 'Escape',
    run: (a) => a.clearSelection(),
  },
];

export const VISIBLE_SHORTCUTS = SHORTCUTS.filter(
  (s) => s.id !== 'redo-y' && s.id !== 'shortcuts-modal',
);

export function createKeyboardShortcutHandler(actions: ShortcutActions) {
  return function handleKeyDown(event: KeyboardEvent, explicitTarget?: EventTarget | null) {
    const target = explicitTarget ?? event.target;
    const editable = isEditableTarget(target);

    for (const shortcut of SHORTCUTS) {
      if (editable && !shortcut.allowInEditable) continue;
      if (!shortcut.matches(event)) continue;

      event.preventDefault();
      shortcut.run(actions);
      return;
    }
  };
}

export function useKeyboardShortcuts() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const toggleShortcutsModal = useCallback(() => {
    setShortcutsOpen((v) => !v);
  }, []);

  const closeShortcutsModal = useCallback(() => {
    setShortcutsOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = createKeyboardShortcutHandler({
      undo: () => useFunnelStore.getState().undo(),
      redo: () => useFunnelStore.getState().redo(),
      duplicate: () => useFunnelStore.getState().duplicate(),
      copy: () => useFunnelStore.getState().copy(),
      cut: () => useFunnelStore.getState().cut(),
      paste: () => useFunnelStore.getState().paste(),
      selectAll: () => useFunnelStore.getState().selectAllScreens(),
      saveProject: () => useFunnelStore.getState().saveProject(),
      setMode: (mode) => useFunnelStore.getState().setMode(mode),
      clearSelection: () => useFunnelStore.getState().clearSelection(),
      toggleShortcutsModal,
    });

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [toggleShortcutsModal]);

  return { shortcutsOpen, closeShortcutsModal };
}
