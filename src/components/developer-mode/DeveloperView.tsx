import { Code2 } from 'lucide-react';
import styles from './DeveloperView.module.css';

export function DeveloperView() {
  return (
    <div className={styles.placeholder}>
      <Code2 size={48} strokeWidth={1} />
      <h2>Developer Mode</h2>
      <p>Monaco Editor with file explorer, live preview, and console.</p>
      <p className={styles.hint}>Coming in Phase 4</p>
    </div>
  );
}
