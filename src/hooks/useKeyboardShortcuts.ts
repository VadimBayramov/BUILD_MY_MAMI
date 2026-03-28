import { useEffect, useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { useFunnelStore } from '@store/funnel-store';
import { createDefaultScreen } from '@store/defaults';
import type { Mode } from '@typedefs/ui';
import { resolveSpaceMode } from '@utils/screen-focus-mode';

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
  toggleMapLock: () => void;
  rename: () => void;
  editId: () => void;
  fitView: () => void;
  autoLayout: () => void;
  newScreen: () => void;
  nextInChain: () => void | false;
  prevInChain: () => void | false;
  followDefault: () => void | false;
  groupIntoBlock: () => void;
  toggleFocusedScreenMode: () => void | false;
  openSearch: () => void;
  goToStart: () => void | false;
  goToEnd: () => void | false;
};

export type ShortcutDefinition = {
  id: string;
  label: string;
  keys: string;
  allowInEditable?: boolean;
  matches: (event: KeyboardEvent) => boolean;
  run: (actions: ShortcutActions) => void | false;
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
    id: 'new-screen',
    label: 'Новый экран',
    keys: 'Ctrl+N',
    matches: (e) => mod(e) && !e.shiftKey && matchesKey(e, 'KeyN', 'n'),
    run: (a) => a.newScreen(),
  },
  {
    id: 'group-block',
    label: 'Группировать в блок',
    keys: 'Ctrl+B',
    matches: (e) => mod(e) && !e.shiftKey && matchesKey(e, 'KeyB', 'b'),
    run: (a) => a.groupIntoBlock(),
  },
  {
    id: 'follow-default',
    label: 'По default-связи',
    keys: 'Ctrl+Enter',
    matches: (e) => mod(e) && e.key === 'Enter',
    run: (a) => a.followDefault(),
  },
  {
    id: 'search-screens',
    label: 'Поиск экранов',
    keys: 'Ctrl+Shift+F',
    allowInEditable: true,
    matches: (e) => mod(e) && e.shiftKey && matchesKey(e, 'KeyF', 'f'),
    run: (a) => a.openSearch(),
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
    id: 'toggle-map-lock',
    label: 'Блокировка карты',
    keys: 'Ctrl+Q',
    matches: (e) => mod(e) && matchesKey(e, 'KeyQ', 'q'),
    run: (a) => a.toggleMapLock(),
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
    id: 'rename',
    label: 'Переименовать экран',
    keys: 'F2',
    matches: (e) => e.key === 'F2',
    run: (a) => a.rename(),
  },
  {
    id: 'edit-id',
    label: 'Изменить ID',
    keys: 'F3',
    matches: (e) => e.key === 'F3',
    run: (a) => a.editId(),
  },
  {
    id: 'toggle-screen-focus',
    label: 'Экран / карта',
    keys: 'Space',
    matches: (e) => !mod(e) && !e.shiftKey && !e.altKey && (e.code === 'Space' || e.key === ' '),
    run: (a) => a.toggleFocusedScreenMode(),
  },
  {
    id: 'next-in-chain',
    label: 'Следующий по цепочке',
    keys: 'Tab',
    matches: (e) => e.key === 'Tab' && !e.shiftKey && !mod(e),
    run: (a) => a.nextInChain(),
  },
  {
    id: 'prev-in-chain',
    label: 'Предыдущий по цепочке',
    keys: 'Shift+Tab',
    matches: (e) => e.key === 'Tab' && e.shiftKey && !mod(e),
    run: (a) => a.prevInChain(),
  },
  {
    id: 'go-start',
    label: 'К стартовому экрану',
    keys: 'Home',
    matches: (e) => !mod(e) && e.key === 'Home',
    run: (a) => a.goToStart(),
  },
  {
    id: 'go-end',
    label: 'К конечному экрану',
    keys: 'End',
    matches: (e) => !mod(e) && e.key === 'End',
    run: (a) => a.goToEnd(),
  },
  {
    id: 'auto-layout',
    label: 'Авто-раскладка',
    keys: 'Ctrl+Shift+L',
    matches: (e) => mod(e) && e.shiftKey && matchesKey(e, 'KeyL', 'l'),
    run: (a) => a.autoLayout(),
  },
  {
    id: 'fit-view',
    label: 'По размеру экрана',
    keys: 'Ctrl+Shift+1',
    matches: (e) => mod(e) && e.shiftKey && (e.key === '1' || e.code === 'Digit1'),
    run: (a) => a.fitView(),
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

      const result = shortcut.run(actions);
      if (result === false) continue;

      event.preventDefault();
      return;
    }
  };
}

function focusNode(nodeId: string, zoom?: number) {
  window.dispatchEvent(new CustomEvent('funnel:focus-node', { detail: { nodeId, zoom } }));
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
      toggleMapLock: () => {
        const state = useFunnelStore.getState();
        state.setMapLocked(!state.ui.mapLocked);
      },
      rename: () => {
        const state = useFunnelStore.getState();
        const screenId = state.ui.selectedScreenIds[0];
        if (!screenId) return;
        state.triggerRename(screenId);
      },
      editId: () => {
        const state = useFunnelStore.getState();
        const elementId = state.ui.selectedElementIds[0];
        const screenId = state.ui.selectedScreenIds[0];
        const targetId = elementId ?? screenId;
        if (!targetId) return;
        state.triggerIdFocus(targetId);
      },
      fitView: () => {
        window.dispatchEvent(new CustomEvent('funnel:fit-view'));
      },
      autoLayout: () => {
        window.dispatchEvent(new CustomEvent('funnel:auto-layout'));
      },

      newScreen: () => {
        const state = useFunnelStore.getState();
        const screens = state.project.funnel.screens;
        const count = Object.keys(screens).length;
        const id = `screen-${nanoid(6)}`;
        const allScreens = Object.values(screens);
        const selectedId = state.ui.selectedScreenIds[0];
        const selected = selectedId ? screens[selectedId] : null;
        const maxX = allScreens.length > 0 ? Math.max(...allScreens.map((s) => s.position.x)) : -350;
        const x = selected ? selected.position.x + 350 : maxX + 350;
        const y = selected?.position.y ?? allScreens[0]?.position.y ?? 0;
        state.addScreen(createDefaultScreen(id, `Screen ${count + 1}`, 'custom', { x, y }, count));
        state.selectScreen(id, false);
        state.triggerRename(id);
      },

      nextInChain: () => {
        const state = useFunnelStore.getState();
        if (state.ui.mode !== 'map' || state.ui.selectedScreenIds.length === 0) return false;
        const screenId = state.ui.selectedScreenIds[0]!;
        const connections = state.project.funnel.connections;
        const target = (connections.find((c) => c.from === screenId && c.isDefault)
          ?? connections.find((c) => c.from === screenId))?.to;
        if (!target || !state.project.funnel.screens[target]) return false;
        state.selectScreen(target, false);
        focusNode(target);
      },

      prevInChain: () => {
        const state = useFunnelStore.getState();
        if (state.ui.mode !== 'map' || state.ui.selectedScreenIds.length === 0) return false;
        const screenId = state.ui.selectedScreenIds[0]!;
        const connections = state.project.funnel.connections;
        const source = (connections.find((c) => c.to === screenId && c.isDefault)
          ?? connections.find((c) => c.to === screenId))?.from;
        if (!source || !state.project.funnel.screens[source]) return false;
        state.selectScreen(source, false);
        focusNode(source);
      },

      followDefault: () => {
        const state = useFunnelStore.getState();
        const screenId = state.ui.selectedScreenIds[0];
        if (!screenId) return false;
        const connections = state.project.funnel.connections;
        const target = (connections.find((c) => c.from === screenId && c.isDefault)
          ?? connections.find((c) => c.from === screenId))?.to;
        if (!target || !state.project.funnel.screens[target]) return false;
        state.selectScreen(target, false);
        focusNode(target);
      },

      groupIntoBlock: () => {
        window.dispatchEvent(new CustomEvent('funnel:group-block'));
      },

      toggleFocusedScreenMode: () => {
        const state = useFunnelStore.getState();
        const orderedScreens = Object.values(state.project.funnel.screens).sort((a, b) => a.order - b.order);
        const selectedScreenId = state.ui.selectedScreenIds[0] ?? null;
        const transition = resolveSpaceMode({
          mode: state.ui.mode,
          selectedScreenId,
          fallbackScreenId: selectedScreenId ?? orderedScreens[0]?.id ?? null,
        });

        if (!transition || !transition.focusScreenId) return false;

        state.selectScreen(transition.focusScreenId, false);
        state.setMode(transition.nextMode);

        if (transition.nextMode === 'map') {
          setTimeout(() => focusNode(transition.focusScreenId!, 1.5), 200);
        }
      },

      openSearch: () => {
        window.dispatchEvent(new CustomEvent('funnel:search-open'));
      },

      goToStart: () => {
        const state = useFunnelStore.getState();
        if (state.ui.mode !== 'map') return false;
        const screens = state.project.funnel.screens;
        let startId = state.project.funnel.meta.startScreenId;
        if (!startId || !screens[startId]) {
          const all = Object.values(screens);
          if (all.length === 0) return false;
          startId = all.reduce((a, b) => (a.order < b.order ? a : b)).id;
        }
        state.selectScreen(startId, false);
        focusNode(startId, 1.5);
      },

      goToEnd: () => {
        const state = useFunnelStore.getState();
        if (state.ui.mode !== 'map') return false;
        const screens = state.project.funnel.screens;
        const connections = state.project.funnel.connections;
        let current = state.project.funnel.meta.startScreenId;
        if (!current || !screens[current]) {
          const all = Object.values(screens);
          if (all.length === 0) return false;
          current = all.reduce((a, b) => (a.order < b.order ? a : b)).id;
        }
        const visited = new Set<string>();
        while (current && !visited.has(current)) {
          visited.add(current);
          const next = connections.find((c) => c.from === current && c.isDefault);
          if (!next || !screens[next.to]) break;
          current = next.to;
        }
        state.selectScreen(current, false);
        focusNode(current, 1.5);
      },
    });

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [toggleShortcutsModal]);

  return { shortcutsOpen, closeShortcutsModal };
}
