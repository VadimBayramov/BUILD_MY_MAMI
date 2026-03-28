import { Settings } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import { ScreenProperties } from '@components/panels/ScreenProperties';
import { ElementProperties } from '@components/panels/ElementProperties';
import { FunnelSettings } from '@components/panels/FunnelSettings';
import styles from './RightPanel.module.css';

export function RightPanel() {
  const mode            = useFunnelStore((s) => s.ui.mode);
  const selectedScreenIds  = useFunnelStore((s) => s.ui.selectedScreenIds);
  const selectedElementIds = useFunnelStore((s) => s.ui.selectedElementIds);
  const screens         = useFunnelStore((s) => s.project.funnel.screens);

  // Element selection takes priority over screen selection
  if (selectedElementIds.length > 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.content}>
          <ElementProperties />
        </div>
      </div>
    );
  }

  if (selectedScreenIds.length === 1) {
    const screen = screens[selectedScreenIds[0]!];
    if (screen) {
      return (
        <div className={styles.panel}>
          <div className={styles.content}>
            <ScreenProperties screen={screen} />
          </div>
        </div>
      );
    }
  }

  if (mode === 'map' || mode === 'manager') {
    return (
      <div className={styles.panel}>
        <div className={styles.content}>
          <FunnelSettings />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <Settings size={32} strokeWidth={1} />
          <p>Select a screen or element to see properties</p>
        </div>
      </div>
    </div>
  );
}
