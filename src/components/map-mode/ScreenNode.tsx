import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Smartphone,
  Copy,
  Trash2,
  ClipboardCopy,
} from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import styles from './ScreenNode.module.css';

interface ScreenNodeData {
  label: string;
  screenType: string;
  order: number;
  [key: string]: unknown;
}

const SCREEN_TYPE_COLORS: Record<string, string> = {
  survey: '#3b82f6',
  question: '#8b5cf6',
  result: '#10b981',
  loader: '#f59e0b',
  form: '#6366f1',
  paywall: '#ef4444',
  custom: '#6b7280',
};

export const ScreenNode = memo(function ScreenNode({ data, selected, id }: NodeProps) {
  const nodeData = data as ScreenNodeData;
  const typeColor = SCREEN_TYPE_COLORS[nodeData.screenType] ?? '#6b7280';

  return (
    <div className={`${styles.node} ${selected ? styles.selected : ''}`}>
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <Handle
        type="target"
        position={Position.Left}
        id="target-zone"
        className={styles.handleZone}
      />

      {selected && (
        <div className={styles.toolbar}>
          <button className={styles.toolBtn} title="Copy" onClick={(e) => e.stopPropagation()}>
            <ClipboardCopy size={13} />
          </button>
          <button
            className={styles.toolBtn}
            title="Duplicate"
            onClick={(e) => {
              e.stopPropagation();
              const store = useFunnelStore.getState();
              store.selectScreen(id, false);
              store.duplicate();
            }}
          >
            <Copy size={13} />
          </button>
          <button
            className={`${styles.toolBtn} ${styles.danger}`}
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              useFunnelStore.getState().deleteScreen(id);
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      <div className={styles.phone}>
        <div className={styles.statusBar}>
          <div className={styles.notch} />
        </div>
        <div className={styles.screen}>
          <Smartphone size={24} strokeWidth={1} className={styles.phoneIcon} />
          <span className={styles.screenLabel}>{nodeData.label}</span>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.typeBadge} style={{ background: typeColor }}>
          {nodeData.screenType}
        </span>
        <span className={styles.orderNum}>#{nodeData.order}</span>
      </div>

      <Handle type="source" position={Position.Right} className={styles.handle} />
    </div>
  );
});
