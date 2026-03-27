import { useFunnelStore } from '@store/funnel-store';

export function useUndoRedo() {
  const undo = useFunnelStore((s) => s.undo);
  const redo = useFunnelStore((s) => s.redo);
  const canUndo = useFunnelStore((s) => s.history.past.length > 0);
  const canRedo = useFunnelStore((s) => s.history.future.length > 0);

  return { undo, redo, canUndo, canRedo };
}
