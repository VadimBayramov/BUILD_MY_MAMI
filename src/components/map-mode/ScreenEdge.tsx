import { useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import type { ConnectionStatus } from '@utils/connection-validator';
import styles from './ScreenEdge.module.css';

const STATUS_STROKE: Record<ConnectionStatus, string> = {
  'default-path': '#3b82f6',
  'conditional':  '#f59e0b',
  'plain':        '#3b82f6',
  'error':        '#f87171',
  'self-loop':    '#ef4444', // red — always an error
  'in-cycle':     '#f97316', // orange — circular default path
};

const STATUS_OPACITY: Record<ConnectionStatus, number> = {
  'default-path': 0.9,
  'conditional':  0.85,
  'plain':        0.40,
  'error':        0.75,
  'self-loop':    0.95,
  'in-cycle':     0.90,
};

interface ScreenEdgeData {
  status: ConnectionStatus;
  errorReason?: string;
  [key: string]: unknown;
}

export function ScreenEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const edgeData = (data ?? {}) as ScreenEdgeData;
  const status: ConnectionStatus = edgeData.status ?? 'plain';
  const stroke = STATUS_STROKE[status];
  const opacity = selected ? 1 : STATUS_OPACITY[status];

  // Self-loop: source handle (right) and target handle (left) belong to the
  // same node. getBezierPath would draw backwards through the node body and
  // produce an unclickable path. Instead, arch above the node.
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (status === 'self-loop') {
    const archHeight = 90;
    edgePath = [
      `M ${sourceX},${sourceY}`,
      `C ${sourceX},${sourceY - archHeight}`,
      `  ${targetX},${targetY - archHeight}`,
      `  ${targetX},${targetY}`,
    ].join(' ');
    labelX = (sourceX + targetX) / 2;
    labelY = sourceY - archHeight * 0.78;
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  }

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      useFunnelStore.getState().deleteConnection(id);
    },
    [id],
  );

  return (
    <>
      {/* Wide transparent hit-area — makes edge easy to click and select */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        style={{ cursor: 'pointer' }}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth: selected ? 2.5 : 1.5,
          opacity,
          strokeDasharray:
            status === 'conditional' ? '6 3' :
            status === 'in-cycle'    ? '5 3' :
            status === 'self-loop'   ? '4 2' : undefined,
        }}
      />

      {/* Delete button — appears only when edge is selected (reliable, no hover race) */}
      <EdgeLabelRenderer>
        {selected && (
          <div
            className={styles.labelWrap}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {edgeData.errorReason && (
              <div className={styles.errorTooltip}>{edgeData.errorReason}</div>
            )}
            <button
              className={styles.deleteBtn}
              onClick={handleDelete}
              title="Remove connection"
            >
              <X size={9} />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
