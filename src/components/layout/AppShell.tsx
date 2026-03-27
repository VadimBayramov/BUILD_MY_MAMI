import { Header } from './Header';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { MapCanvas } from '../map-mode/MapCanvas';
import { ManagerView } from '../manager-mode/ManagerView';
import { DeveloperView } from '../developer-mode/DeveloperView';
import { useFunnelStore } from '@store/funnel-store';
import styles from './AppShell.module.css';

export function AppShell() {
  const mode = useFunnelStore((s) => s.ui.mode);
  const leftCollapsed = useFunnelStore((s) => s.ui.leftPanelCollapsed);
  const rightCollapsed = useFunnelStore((s) => s.ui.rightPanelCollapsed);
  const leftWidth = useFunnelStore((s) => s.ui.leftPanelWidth);
  const rightWidth = useFunnelStore((s) => s.ui.rightPanelWidth);

  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.body}>
        {!leftCollapsed && (
          <aside className={styles.leftPanel} style={{ width: leftWidth }}>
            <LeftPanel />
          </aside>
        )}
        <main className={styles.canvas}>
          {mode === 'map' && <MapCanvas />}
          {mode === 'manager' && <ManagerView />}
          {mode === 'developer' && <DeveloperView />}
        </main>
        {!rightCollapsed && (
          <aside className={styles.rightPanel} style={{ width: rightWidth }}>
            <RightPanel />
          </aside>
        )}
      </div>
    </div>
  );
}
