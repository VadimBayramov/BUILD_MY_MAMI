import { useFunnelStore } from '@store/funnel-store';
import styles from './ScreenList.module.css';

export function ScreenList() {
  const screens = useFunnelStore((s) => s.project.funnel.screens);
  const selectedIds = useFunnelStore((s) => s.ui.selectedScreenIds);
  const selectScreen = useFunnelStore((s) => s.selectScreen);
  const sorted = Object.values(screens).sort((a, b) => a.order - b.order);

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Screens ({sorted.length})</h3>
      <div className={styles.screenList}>
        {sorted.map((screen) => (
          <button
            key={screen.id}
            className={`${styles.screenItem} ${selectedIds.includes(screen.id) ? styles.selected : ''}`}
            onClick={() => selectScreen(screen.id)}
          >
            <span className={styles.screenOrder}>{screen.order}.</span>
            <span className={styles.screenName}>{screen.name}</span>
            <span className={styles.screenType}>{screen.type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
