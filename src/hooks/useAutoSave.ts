import { useEffect, useRef } from 'react';
import { useFunnelStore } from '@store/funnel-store';

export function useAutoSave() {
  const updatedAt = useFunnelStore((s) => s.project.updatedAt);
  const saveProject = useFunnelStore((s) => s.saveProject);
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      skipNext.current = true;
      void saveProject();
    }, 2000);
    return () => window.clearTimeout(t);
  }, [updatedAt, saveProject]);
}
