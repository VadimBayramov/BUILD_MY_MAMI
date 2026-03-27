import { useCallback, useEffect, useState } from 'react';
import { useFunnelStore } from '@store/funnel-store';

type Options = {
  side: 'left' | 'right';
  minWidth: number;
  maxWidth: number;
};

export function useResizablePanel({ side, minWidth, maxWidth }: Options) {
  const width = useFunnelStore((s) => (side === 'left' ? s.ui.leftPanelWidth : s.ui.rightPanelWidth));
  const resizePanel = useFunnelStore((s) => s.resizePanel);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    const end = () => setIsResizing(false);
    window.addEventListener('mouseup', end);
    return () => window.removeEventListener('mouseup', end);
  }, [isResizing]);

  const onResizeStart = useCallback(() => setIsResizing(true), []);

  const onResize = useCallback(
    (w: number) => {
      const clamped = Math.min(maxWidth, Math.max(minWidth, w));
      resizePanel(side, clamped);
    },
    [side, minWidth, maxWidth, resizePanel],
  );

  return { width, isResizing, onResizeStart, onResize };
}
