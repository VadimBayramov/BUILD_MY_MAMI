import { useFunnelStore } from '@store/funnel-store';
import styles from './StatusBar.module.css';

export function StatusBar() {
  const mode = useFunnelStore((s) => s.ui.mode);
  const screenCount = useFunnelStore((s) => Object.keys(s.project.funnel.screens).length);
  const selectedScreens = useFunnelStore((s) => s.ui.selectedScreenIds.length);
  const selectedElements = useFunnelStore((s) => s.ui.selectedElementIds.length);
  const mapScale = useFunnelStore((s) => s.ui.mapScale);

  const selectedTotal = selectedScreens + selectedElements;
  const zoomPct = Math.round(mapScale * 100);

  return (
    <footer className={styles.bar}>
      <div className={styles.group}>
        <span className={styles.item}>
          Mode: <strong>{mode}</strong>
        </span>
        <span className={styles.item}>
          Screens: <strong>{screenCount}</strong>
        </span>
        <span className={styles.item}>
          Selected: <strong>{selectedTotal}</strong>
        </span>
      </div>
      <div className={styles.group}>
        <span className={styles.item}>
          Zoom: <strong>{zoomPct}%</strong>
        </span>
      </div>
    </footer>
  );
}
