import { useEffect } from 'react';
import { AppShell } from '@components/layout/AppShell';
import { ShortcutsModal } from '@components/shared';
import { useAutoSave } from '@hooks/useAutoSave';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import { getLastOpenedProjectId } from '@store/middleware/persist';
import { useFunnelStore } from '@store/funnel-store';
import { componentRegistry } from '@services/component-registry';
import type { ComponentManifest } from '@typedefs/component';

// Load block-library manifest once at module init (bundled by Vite)
import manifestJson from '../block-library/component-manifest.json';
componentRegistry.loadFromManifest(manifestJson as ComponentManifest);

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
