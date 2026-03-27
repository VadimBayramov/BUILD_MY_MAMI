import { Code2 } from 'lucide-react';
import styles from './FileExplorer.module.css';

export function FileExplorer() {
  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Explorer</h3>
      <div className={styles.placeholder}>
        <Code2 size={32} strokeWidth={1} />
        <p>File explorer will be available in Developer mode</p>
      </div>
    </div>
  );
}
