import { LayoutDashboard } from 'lucide-react';
import styles from './ManagerView.module.css';

export function ManagerView() {
  return (
    <div className={styles.placeholder}>
      <LayoutDashboard size={48} strokeWidth={1} />
      <h2>Manager Mode</h2>
      <p>Live preview with screen list and element tree.</p>
      <p className={styles.hint}>Coming in Phase 4</p>
    </div>
  );
}
