import { Header } from './Header';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { PanelResizer } from './PanelResizer';
import { MapCanvas } from '../map-mode/MapCanvas';
import { ManagerView } from '../manager-mode/ManagerView';
import { DeveloperView } from '../developer-mode/DeveloperView';
import { useResizablePanel } from '@hooks/useResizablePanel';
import { useFunnelStore } from '@store/funnel-store';
import styles from './AppShell.module.css';

export function AppShell() {
  const mode = useFunnelStore((s) => s.ui.mode);
  const leftCollapsed = useFunnelStore((s) => s.ui.leftPanelCollapsed);
  const rightCollapsed = useFunnelStore((s) => s.ui.rightPanelCollapsed);
  const maxPanelWidth = typeof window === 'undefined' ? 640 : Math.floor(window.innerWidth * 0.5);
  const leftPanel = useResizablePanel({ side: 'left', minWidth: 200, maxWidth: maxPanelWidth });
  const rightPanel = useResizablePanel({ side: 'right', minWidth: 240, maxWidth: maxPanelWidth });

  const templateColumns = [
    !leftCollapsed ? `${leftPanel.width}px` : null,
    !leftCollapsed ? '4px' : null,
    'minmax(0, 1fr)',
    !rightCollapsed ? '4px' : null,
    !rightCollapsed ? `${rightPanel.width}px` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.body} style={{ gridTemplateColumns: templateColumns }}>
        {!leftCollapsed && (
          <aside className={styles.leftPanel} style={{ width: leftPanel.width }}>
            <LeftPanel />
          </aside>
        )}
        {!leftCollapsed && (
          <PanelResizer
            side="left"
            width={leftPanel.width}
            minWidth={200}
            maxWidth={maxPanelWidth}
            onResize={leftPanel.onResize}
            onResizeStart={leftPanel.onResizeStart}
          />
        )}
        <main className={styles.canvas}>
          {mode === 'map' && <MapCanvas />}
          {mode === 'manager' && <ManagerView />}
          {mode === 'developer' && <DeveloperView />}
        </main>
        {!rightCollapsed && (
          <PanelResizer
            side="right"
            width={rightPanel.width}
            minWidth={240}
            maxWidth={maxPanelWidth}
            onResize={rightPanel.onResize}
            onResizeStart={rightPanel.onResizeStart}
          />
        )}
        {!rightCollapsed && (
          <aside className={styles.rightPanel} style={{ width: rightPanel.width }}>
            <RightPanel />
          </aside>
        )}
      </div>
    </div>
  );
}
