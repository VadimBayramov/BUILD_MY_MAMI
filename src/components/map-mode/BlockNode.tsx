import { memo, useState, useCallback } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import { Pencil, Trash2, Check } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import styles from './BlockNode.module.css';

interface BlockNodeData {
  label: string;
  color: string;
  width: number;
  height: number;
  screenIds: string[];
  [key: string]: unknown;
}

export const BlockNode = memo(function BlockNode({ data, id, selected }: NodeProps) {
  const nodeData = data as BlockNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);

  const handleSave = useCallback(() => {
    useFunnelStore.getState().updateBlock(id, { label });
    setEditing(false);
  }, [id, label]);

  const handleResizeEnd = useCallback(
    (_event: unknown, params: { width: number; height: number }) => {
      useFunnelStore.getState().updateBlock(id, {
        width: Math.round(params.width),
        height: Math.round(params.height),
      });
    },
    [id],
  );

  return (
    <div
      className={`${styles.block} ${selected ? styles.selected : ''}`}
      style={{
        width: nodeData.width,
        height: nodeData.height,
        borderColor: nodeData.color,
        backgroundColor: `${nodeData.color}10`,
      }}
    >
      <NodeResizer
        isVisible={selected ?? false}
        minWidth={200}
        minHeight={100}
        lineStyle={{ borderColor: nodeData.color, borderWidth: 2 }}
        handleStyle={{ backgroundColor: nodeData.color, width: 8, height: 8, borderRadius: 2 }}
        onResizeEnd={handleResizeEnd}
      />
      <div className={styles.header} style={{ backgroundColor: nodeData.color }}>
        {editing ? (
          <input
            className={styles.input}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            autoFocus
          />
        ) : (
          <span className={styles.label}>{nodeData.label}</span>
        )}
        <div className={styles.actions}>
          {editing ? (
            <button className={styles.actionBtn} onClick={handleSave} title="Save">
              <Check size={12} />
            </button>
          ) : (
            <button className={styles.actionBtn} onClick={() => setEditing(true)} title="Rename">
              <Pencil size={12} />
            </button>
          )}
          <button
            className={`${styles.actionBtn} ${styles.danger}`}
            onClick={() => useFunnelStore.getState().deleteBlock(id)}
            title="Delete block"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
});
