import { useCallback, useState } from 'react';

export type ContextMenuTarget =
  | { kind: 'screen'; screenId: string; x: number; y: number }
  | { kind: 'edge'; connectionId: string; x: number; y: number }
  | { kind: 'block'; blockId: string; x: number; y: number }
  | { kind: 'canvas'; x: number; y: number };

export function useContextMenu() {
  const [target, setTarget] = useState<ContextMenuTarget | null>(null);

  const open = useCallback((t: ContextMenuTarget) => setTarget(t), []);
  const close = useCallback(() => setTarget(null), []);

  return { target, open, close };
}
