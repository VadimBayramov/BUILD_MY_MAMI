import { Settings } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import { ScreenProperties } from '@components/panels/ScreenProperties';
import { ElementProperties } from '@components/panels/ElementProperties';
import { FunnelSettings } from '@components/panels/FunnelSettings';
import styles from './RightPanel.module.css';

export function RightPanel() {
  const mode = useFunnelStore((s) => s.ui.mode);
  const selectedScreenIds = useFunnelStore((s) => s.ui.selectedScreenIds);
  const selectedElementIds = useFunnelStore((s) => s.ui.selectedElementIds);
  const screens = useFunnelStore((s) => s.project.funnel.screens);

  if (selectedScreenIds.length === 1) {
    const screen = screens[selectedScreenIds[0]!];
    if (screen) return <ScreenProperties screen={screen} />;
  }

  if (selectedElementIds.length > 0) {
    return <ElementProperties />;
  }

  if (mode === 'map') return <FunnelSettings />;

  return (
    <div className={styles.panel}>
      <div className={styles.placeholder}>
        <Settings size={32} strokeWidth={1} />
        <p>Select a screen or element to see properties</p>
      </div>
    </div>
  );
}
