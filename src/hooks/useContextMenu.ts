import { useCallback, useState } from 'react';

export type ContextMenuItem = {
  label: string;
  action: () => void;
  shortcut?: string;
};

export function useContextMenu(items: ContextMenuItem[]) {
  const [isOpen, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const open = useCallback((x: number, y: number) => {
    setPosition({ x, y });
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return { isOpen, position, items, open, close };
}
