import { useEffect } from 'react';
import { Controls, useReactFlow } from '@xyflow/react';

export function CanvasControls() {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const ctrl = event.ctrlKey || event.metaKey;

      if (ctrl && event.shiftKey && event.key === '1') {
        event.preventDefault();
        void fitView({ padding: 0.3 });
      }

      if (event.key === '+') {
        event.preventDefault();
        void zoomIn();
      }

      if (event.key === '-') {
        event.preventDefault();
        void zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitView, zoomIn, zoomOut]);

  return (
    <Controls
      showInteractive={false}
      style={{ background: '#1a1d24', border: '1px solid #2d3139', borderRadius: 8 }}
    />
  );
}
