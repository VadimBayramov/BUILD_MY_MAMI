import { Smartphone } from 'lucide-react';
import type { Screen } from '@typedefs/funnel';
import styles from './ScreenProperties.module.css';

interface Props {
  screen: Screen;
}

export function ScreenProperties({ screen }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Smartphone size={16} />
        <h3 className={styles.title}>Screen: {screen.name}</h3>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>General</div>
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input className={styles.input} value={screen.name} readOnly />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>ID (slug)</label>
          <input className={styles.input} value={screen.id} readOnly />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Type</label>
          <div className={styles.badge}>{screen.type}</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Navigation</div>
        <div className={styles.row}>
          <span className={styles.label}>Progress bar</span>
          <div className={styles.toggle} />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Back button</span>
          <div className={styles.toggle} />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Auto-navigate</span>
          <div className={styles.toggle} />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Appearance</div>
        <p className={styles.hint}>Style editing will be available in Phase 2</p>
      </div>
    </div>
  );
}
