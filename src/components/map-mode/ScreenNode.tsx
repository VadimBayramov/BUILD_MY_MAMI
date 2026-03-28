import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Smartphone,
  Copy,
  Trash2,
  ClipboardCopy,
  AlertTriangle,
  CopyX,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useFunnelStore } from '@store/funnel-store';
import { SortableElementRow } from './SortableElementRow';
import styles from './ScreenNode.module.css';

// Stable fallback — prevents infinite re-renders when byScreen[id] is undefined
const EMPTY_IDS: string[] = [];

const ELEMENT_TYPE_ABBR: Record<string, string> = {
  heading: 'H',
  paragraph: 'P',
  image: 'Img',
  'hero-image': 'Img',
  button: 'Btn',
  option: 'Opt',
  'option-tile': 'Tile',
  container: 'Box',
  spacer: '—',
  'progress-bar': '%',
  input: 'Input',
  card: 'Card',
  paywall: '$',
  'raw-html': 'HTML',
  'survey-options': 'Survey',
  footer: 'Footer',
  divider: 'Line',
  icon: 'Icon',
  video: 'Vid',
  review: 'Rev',
  timer: 'Timer',
  loader: 'Load',
  custom: 'Custom',
};

interface ScreenNodeData {
  label: string;
  screenType: string;
  order: number;
  isStart: boolean;
  isDeadEnd: boolean;
  isDuplicateDefault: boolean;
  isInCycle: boolean;
  isUnreachable: boolean;
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

  const elementIds = useFunnelStore(
    useCallback((s) => s.elementIndexes.byScreen[id] ?? EMPTY_IDS, [id]),
  );
  const elements = useFunnelStore((s) => s.project.funnel.elements);
  const selectedElementIds = useFunnelStore((s) => s.ui.selectedElementIds);

  const hasWarning =
    nodeData.isDeadEnd ||
    nodeData.isDuplicateDefault ||
    nodeData.isInCycle ||
    nodeData.isUnreachable;

  return (
    <div
      className={[
        styles.node,
        selected ? styles.selected : '',
        nodeData.isInCycle ? styles.inCycle :
        nodeData.isDuplicateDefault ? styles.duplicateDefault :
        nodeData.isDeadEnd ? styles.deadEnd :
        nodeData.isUnreachable ? styles.unreachable : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <Handle
        type="target"
        position={Position.Left}
        id="target-zone"
        className={styles.handleZone}
      />

      {/* Toolbar on select */}
      {selected && (
        <div className={styles.toolbar}>
          <button
            className={styles.toolBtn}
            title="Copy"
            onClick={(e) => {
              e.stopPropagation();
              const store = useFunnelStore.getState();
              store.selectScreen(id, false);
              store.copy();
            }}
          >
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

      {/* START badge */}
      {nodeData.isStart && (
        <div className={styles.startBadge} title="Start screen">START</div>
      )}

      {/* Warning badge — highest-severity error wins */}
      {hasWarning && (
        <div
          className={styles.warningBadge}
          title={
            nodeData.isInCycle          ? 'Infinite loop — users will cycle here forever on the default path' :
            nodeData.isDuplicateDefault ? 'Multiple default paths — routing is ambiguous' :
            nodeData.isDeadEnd          ? 'Dead end — screen has no outgoing connections' :
                                          'Unreachable — no path from start leads here'
          }
        >
          {nodeData.isInCycle          ? <RefreshCw size={12} /> :
           nodeData.isDuplicateDefault ? <CopyX size={12} /> :
           nodeData.isDeadEnd          ? <AlertTriangle size={12} /> :
                                         <Unlink size={12} />}
        </div>
      )}

      <div className={styles.phone}>
        <div className={styles.statusBar}>
          <div className={styles.notch} />
        </div>
        <div className={styles.screen}>
          {elementIds.length > 0 ? (
            <div className={styles.elementList}>
              <SortableContext items={elementIds} strategy={verticalListSortingStrategy}>
                {elementIds.map((elId) => {
                  const el = elements[elId];
                  if (!el) return null;
                  return (
                    <SortableElementRow
                      key={elId}
                      elementId={elId}
                      screenId={id}
                      abbr={ELEMENT_TYPE_ABBR[el.type] ?? el.type}
                      content={el.content || el.type}
                      isSelected={selectedElementIds.includes(elId)}
                    />
                  );
                })}
              </SortableContext>
            </div>
          ) : (
            <>
              <Smartphone size={24} strokeWidth={1} className={styles.phoneIcon} />
              <span className={styles.screenLabel}>{nodeData.label}</span>
            </>
          )}
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
