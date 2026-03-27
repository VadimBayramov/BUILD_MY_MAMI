import { Layers } from 'lucide-react';
import styles from './ElementProperties.module.css';

export function ElementProperties() {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Layers size={16} />
        <h3 className={styles.title}>Element Properties</h3>
      </div>
      <div className={styles.placeholder}>
        <p>Element editing will be available in Phase 2</p>
      </div>
    </div>
  );
}
