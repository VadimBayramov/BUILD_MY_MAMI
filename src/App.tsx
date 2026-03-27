import { useEffect } from 'react';
import { AppShell } from '@components/layout/AppShell';
import { ShortcutsModal } from '@components/shared';
import { useAutoSave } from '@hooks/useAutoSave';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import { getLastOpenedProjectId } from '@store/middleware/persist';
import { useFunnelStore } from '@store/funnel-store';

export function App() {
  const loadProject = useFunnelStore((s) => s.loadProject);

  const { shortcutsOpen, closeShortcutsModal } = useKeyboardShortcuts();
  useAutoSave();

  useEffect(() => {
    const projectId = getLastOpenedProjectId();
    if (!projectId) return;

    void loadProject(projectId);
  }, [loadProject]);

  return (
    <>
      <AppShell />
      <ShortcutsModal open={shortcutsOpen} onClose={closeShortcutsModal} />
    </>
  );
}
