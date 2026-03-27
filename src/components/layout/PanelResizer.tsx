import { useCallback, useState } from 'react';
import styles from './PanelResizer.module.css';

type Props = {
  side: 'left' | 'right';
  width: number;
  onResize: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  onResizeStart?: () => void;
};

export function PanelResizer({
  side,
  width,
  onResize,
  minWidth = 160,
  maxWidth = 640,
  onResizeStart,
}: Props) {
  const [dragging, setDragging] = useState(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      onResizeStart?.();
      setDragging(true);
      const startX = e.clientX;
      const startW = width;

      const clamp = (w: number) => Math.min(maxWidth, Math.max(minWidth, w));

      const onMove = (ev: globalThis.MouseEvent) => {
        const dx = ev.clientX - startX;
        const next = side === 'left' ? startW + dx : startW - dx;
        onResize(clamp(next));
      };

      const onUp = () => {
        setDragging(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [side, width, onResize, minWidth, maxWidth, onResizeStart],
  );

  return (
    <div
      className={`${styles.handle}${dragging ? ` ${styles.dragging}` : ''}`}
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
    />
  );
}
