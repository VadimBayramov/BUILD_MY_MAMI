import { useEffect } from 'react';
import { useFunnelStore } from '@store/funnel-store';

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useFunnelStore.getState().undo();
      }

      if (ctrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        useFunnelStore.getState().redo();
      }

      if (ctrl && e.key === 'Z') {
        e.preventDefault();
        useFunnelStore.getState().redo();
      }

      if (ctrl && e.key === 'd') {
        e.preventDefault();
        useFunnelStore.getState().duplicate();
      }

      if (e.key === '1' && !ctrl) {
        useFunnelStore.getState().setMode('map');
      }
      if (e.key === '2' && !ctrl) {
        useFunnelStore.getState().setMode('manager');
      }
      if (e.key === '3' && !ctrl) {
        useFunnelStore.getState().setMode('developer');
      }

      if (e.key === 'Escape') {
        useFunnelStore.getState().clearSelection();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
