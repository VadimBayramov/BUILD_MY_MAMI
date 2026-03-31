import { useCallback, useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, Strikethrough, Link } from 'lucide-react';
import styles from './TextFormatToolbar.module.css';

interface TextFormatToolbarProps {
  anchorRect: { top: number; left: number; width: number } | null;
  containerEl: HTMLElement | null;
}

function execCmd(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function queryCmd(cmd: string): boolean {
  try { return document.queryCommandState(cmd); } catch { return false; }
}

export function TextFormatToolbar({ anchorRect, containerEl }: TextFormatToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [formatState, setFormatState] = useState({
    bold: false, italic: false, underline: false, strikethrough: false,
  });

  const refreshState = useCallback(() => {
    setFormatState({
      bold: queryCmd('bold'),
      italic: queryCmd('italic'),
      underline: queryCmd('underline'),
      strikethrough: queryCmd('strikeThrough'),
    });
  }, []);

  useEffect(() => {
    const onSelect = () => refreshState();
    document.addEventListener('selectionchange', onSelect);
    return () => document.removeEventListener('selectionchange', onSelect);
  }, [refreshState]);

  const toggle = useCallback((cmd: string) => {
    containerEl?.focus();
    execCmd(cmd);
    refreshState();
  }, [containerEl, refreshState]);

  const insertLink = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const url = prompt('URL:', 'https://');
    if (url) {
      containerEl?.focus();
      execCmd('createLink', url);
    }
  }, [containerEl]);

  const changeColor = useCallback((color: string) => {
    containerEl?.focus();
    execCmd('foreColor', color);
  }, [containerEl]);

  if (!anchorRect) return null;

  const toolbarWidth = 230;
  const top = anchorRect.top - 42;
  const left = anchorRect.left + anchorRect.width / 2 - toolbarWidth / 2;

  return (
    <div
      ref={ref}
      data-fb-toolbar
      className={styles.toolbar}
      style={{ top: Math.max(4, top), left: Math.max(4, left) }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        tabIndex={-1}
        className={`${styles.btn} ${formatState.bold ? styles.btnActive : ''}`}
        onClick={() => toggle('bold')}
        title="Bold"
      >
        <Bold size={14} />
      </button>
      <button
        tabIndex={-1}
        className={`${styles.btn} ${formatState.italic ? styles.btnActive : ''}`}
        onClick={() => toggle('italic')}
        title="Italic"
      >
        <Italic size={14} />
      </button>
      <button
        tabIndex={-1}
        className={`${styles.btn} ${formatState.underline ? styles.btnActive : ''}`}
        onClick={() => toggle('underline')}
        title="Underline"
      >
        <Underline size={14} />
      </button>
      <button
        tabIndex={-1}
        className={`${styles.btn} ${formatState.strikethrough ? styles.btnActive : ''}`}
        onClick={() => toggle('strikeThrough')}
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </button>

      <div className={styles.sep} />

      <button tabIndex={-1} className={styles.btn} onClick={insertLink} title="Link">
        <Link size={14} />
      </button>

      <div className={styles.sep} />

      <input
        tabIndex={-1}
        type="color"
        className={styles.colorInput}
        defaultValue="#ffffff"
        onChange={(e) => changeColor(e.target.value)}
        title="Text color"
      />
    </div>
  );
}
