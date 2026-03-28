import { Settings } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import { GlobalStylesPanel } from './sections/GlobalStylesPanel';
import styles from './FunnelSettings.module.css';

export function FunnelSettings() {
  const meta = useFunnelStore((s) => s.project.funnel.meta);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Settings size={16} />
        <h3 className={styles.title}>Funnel Settings</h3>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>General</div>
        <div className={styles.field}>
          <label className={styles.label}>Funnel name</label>
          <input className={styles.input} value={meta.name} readOnly />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Start screen</label>
          <div className={styles.badge}>{meta.startScreenId}</div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Language</label>
          <div className={styles.badge}>{meta.lang}</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Global Styles</div>
        <GlobalStylesPanel />
      </div>
    </div>
  );
}
