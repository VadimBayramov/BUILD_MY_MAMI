import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import { Pencil, Trash2, Check, Palette } from 'lucide-react';
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
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    useFunnelStore.getState().updateBlock(id, { label });
    setEditing(false);
  }, [id, label]);

  // Sync label when external data changes (e.g. after undo)
  useEffect(() => { setLabel(nodeData.label); }, [nodeData.label]);

  // F2 / context-menu rename trigger
  useEffect(() => {
    const handler = () => setEditing(true);
    window.addEventListener(`funnel:rename-block:${id}`, handler);
    return () => window.removeEventListener(`funnel:rename-block:${id}`, handler);
  }, [id]);

  // Context-menu color picker trigger
  useEffect(() => {
    const handler = () => colorInputRef.current?.click();
    window.addEventListener(`funnel:pick-color-block:${id}`, handler);
    return () => window.removeEventListener(`funnel:pick-color-block:${id}`, handler);
  }, [id]);

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
            <button className={styles.actionBtn} onClick={handleSave} title="Save (Enter)">
              <Check size={12} />
            </button>
          ) : (
            <button className={styles.actionBtn} onClick={() => setEditing(true)} title="Rename (F2)">
              <Pencil size={12} />
            </button>
          )}
          <button
            className={styles.actionBtn}
            onClick={() => colorInputRef.current?.click()}
            title="Change color"
          >
            <Palette size={12} />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={nodeData.color}
            onChange={(e) => useFunnelStore.getState().updateBlock(id, { color: e.target.value })}
            className={styles.colorInput}
            tabIndex={-1}
          />
          <button
            className={`${styles.actionBtn} ${styles.danger}`}
            onClick={() => useFunnelStore.getState().deleteBlock(id)}
            title="Delete block (Del)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
});
