import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useDroppable } from '@dnd-kit/core';
import {
  Copy,
  Trash2,
  ClipboardCopy,
  AlertTriangle,
  CopyX,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import { getScreenHtml } from '@services/html-cache';
import { buildPreviewDocument } from '@utils/preview-document';
import styles from './ScreenNode.module.css';

const PREVIEW_STYLE = `
  html, body {
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }
  body::-webkit-scrollbar { width: 3px; }
  body::-webkit-scrollbar-track { background: transparent; }
  body::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
`;

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
  survey:   '#3b82f6',
  question: '#8b5cf6',
  result:   '#10b981',
  loader:   '#f59e0b',
  form:     '#6366f1',
  paywall:  '#ef4444',
  custom:   '#6b7280',
};

export const ScreenNode = memo(function ScreenNode({ data, selected, id }: NodeProps) {
  const nodeData = data as ScreenNodeData;
  const typeColor = SCREEN_TYPE_COLORS[nodeData.screenType] ?? '#6b7280';

  const screen = useFunnelStore(
    useCallback((state) => state.project.funnel.screens[id] ?? null, [id]),
  );
  const elements = useFunnelStore((state) => state.project.funnel.elements);
  const elementIndexes = useFunnelStore((state) => state.elementIndexes);
  const globalStyles = useFunnelStore((state) => state.project.funnel.globalStyles);
  const mapLocked = useFunnelStore((state) => state.ui.mapLocked);

  // Make the phone body a dnd-kit drop target so block library items land here
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({ id });
  const hasElements = (elementIndexes.byScreen[id]?.length ?? 0) > 0;

  const html = useMemo(() => {
    if (!screen) return '';
    return getScreenHtml(id, elements, elementIndexes, screen, globalStyles);
  }, [screen, id, elements, elementIndexes, globalStyles]);

  const srcDoc = useMemo(() => {
    const doc = buildPreviewDocument(html);
    return doc.replace('</head>', `<style>${PREVIEW_STYLE}</style></head>`);
  }, [html]);

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
        nodeData.isInCycle          ? styles.inCycle :
        nodeData.isDuplicateDefault ? styles.duplicateDefault :
        nodeData.isDeadEnd          ? styles.deadEnd :
        nodeData.isUnreachable      ? styles.unreachable : '',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={mapLocked ? { opacity: 0, pointerEvents: 'none' } : undefined}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-zone"
        className={styles.handleZone}
        style={mapLocked ? { pointerEvents: 'none' } : undefined}
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

      {/* Warning badge */}
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

      {/* ── iPhone 14 frame ── */}
      <div
        ref={setDropRef}
        className={`${styles.phone} ${isDropOver ? styles.dropOver : ''}`}
      >
        {/* Side buttons */}
        <div className={styles.btnVolUp} />
        <div className={styles.btnVolDown} />
        <div className={styles.btnPower} />

        {/* Screen area */}
        <div className={styles.screen}>
          {/* Dynamic Island */}
          <div className={styles.dynamicIsland} />

          {/* Content */}
          <div className={styles.screenContent}>
            {hasElements ? (
              <iframe
                className={styles.previewFrame}
                srcDoc={srcDoc}
                sandbox="allow-same-origin"
                title={`Map preview: ${nodeData.label}`}
              />
            ) : (
              <div className={styles.emptyHint}>
                <span className={styles.screenLabel}>{nodeData.label}</span>
                <span className={styles.emptySubHint}>
                  {isDropOver ? 'Release to add' : 'Drop blocks here'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.typeBadge} style={{ background: typeColor }}>
          {nodeData.screenType.toUpperCase()}
        </span>
        <span className={styles.orderNum}>#{nodeData.order}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={mapLocked ? { opacity: 0, pointerEvents: 'none' } : undefined}
      />
    </div>
  );
});
