import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import styles from './ContextMenu.module.css';

export type ContextMenuEntry =
  | { type: 'item'; id: string; label: string; shortcut?: string; onClick: () => void; disabled?: boolean }
  | { type: 'separator' }
  | { type: 'submenu'; id: string; label: string; items: ContextMenuEntry[] };

interface Props {
  entries: ContextMenuEntry[];
  x: number;
  y: number;
  onClose: () => void;
}

interface SubMenuProps {
  items: ContextMenuEntry[];
  onClose: () => void;
  parentRef: React.RefObject<HTMLLIElement | null>;
}

function SubMenu({ items, onClose, parentRef }: SubMenuProps) {
  const menuRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!parentRef.current || !menuRef.current) return;
    const rect = parentRef.current.getBoundingClientRect();
    const mw = menuRef.current.offsetWidth || 180;
    const mh = menuRef.current.offsetHeight || 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = rect.right + mw > vw ? rect.left - mw : rect.right;
    const top = rect.top + mh > vh ? Math.max(0, vh - mh - 8) : rect.top;
    setPos({ top, left });
  }, [parentRef]);

  return (
    <ul
      ref={menuRef}
      className={styles.menu}
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
    >
      {items.map((entry, i) => (
        <MenuEntry key={i} entry={entry} onClose={onClose} />
      ))}
    </ul>
  );
}

function MenuEntry({ entry, onClose }: { entry: ContextMenuEntry; onClose: () => void }) {
  const liRef = useRef<HTMLLIElement>(null);
  const [subOpen, setSubOpen] = useState(false);

  if (entry.type === 'separator') {
    return <li className={styles.separator} role="separator" />;
  }

  if (entry.type === 'submenu') {
    return (
      <li
        ref={liRef}
        className={`${styles.item} ${styles.hasSubmenu}`}
        onMouseEnter={() => setSubOpen(true)}
        onMouseLeave={() => setSubOpen(false)}
      >
        <span className={styles.label}>{entry.label}</span>
        <ChevronRight size={12} className={styles.chevron} />
        {subOpen && <SubMenu items={entry.items} onClose={onClose} parentRef={liRef} />}
      </li>
    );
  }

  return (
    <li
      className={`${styles.item} ${entry.disabled ? styles.disabled : ''}`}
      onClick={() => {
        if (entry.disabled) return;
        entry.onClick();
        onClose();
      }}
    >
      <span className={styles.label}>{entry.label}</span>
      {entry.shortcut && <span className={styles.shortcut}>{entry.shortcut}</span>}
    </li>
  );
}

export function ContextMenu({ entries, x, y, onClose }: Props) {
  const menuRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState({ top: y, left: x });

  // Clamp to viewport after mount
  useEffect(() => {
    if (!menuRef.current) return;
    const mw = menuRef.current.offsetWidth;
    const mh = menuRef.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      top: y + mh > vh ? Math.max(0, vh - mh - 8) : y,
      left: x + mw > vw ? Math.max(0, vw - mw - 8) : x,
    });
  }, [x, y]);

  // Close on outside click or Escape
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <ul
      ref={menuRef}
      className={styles.menu}
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {entries.map((entry, i) => (
        <MenuEntry key={i} entry={entry} onClose={onClose} />
      ))}
    </ul>,
    document.body,
  );
}
