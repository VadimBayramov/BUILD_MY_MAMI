import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Copy,
  Trash2,
  ClipboardCopy,
  AlertTriangle,
  CopyX,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { useFunnelStore } from '@store/funnel-store';
import { getScreenHtml } from '@services/html-cache';
import { buildPreviewDocument } from '@utils/preview-document';
import { getElementOrderGroup } from '@utils/element-order';
import type { FunnelElement, ElementIndexes } from '@typedefs/funnel';
import styles from './ScreenNode.module.css';

const SCALE = 0.618;

const PREVIEW_STYLE = `
  html, body {
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }
  body::-webkit-scrollbar { width: 3px; }
  body::-webkit-scrollbar-track { background: transparent; }
  body::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }

  [data-editable="true"] { cursor: text; }
  [data-editable="true"]:hover { outline: 1.5px dashed rgba(59,130,246,0.4); outline-offset: 2px; }
  [data-editable="true"][contenteditable="true"] {
    outline: 2px solid rgba(59,130,246,0.85) !important;
    outline-offset: 2px;
    background: rgba(59,130,246,0.04);
  }

  .funnel-container-box {
    resize: both;
    overflow: auto;
    border: 1px dashed rgba(59,130,246,0.3);
    box-sizing: border-box;
  }
  .funnel-container-box:hover {
    border-color: rgba(59,130,246,0.6);
  }

  #_fb_toolbar {
    display: none;
    position: fixed;
    z-index: 99999;
    align-items: center;
    gap: 1px;
    padding: 3px 4px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    user-select: none;
    font-family: system-ui, -apple-system, sans-serif;
  }
  #_fb_toolbar.active { display: flex; }

  #_fb_toolbar button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
    font-family: inherit;
    padding: 0;
    transition: background 0.1s, color 0.1s;
  }
  #_fb_toolbar button:hover { background: #334155; color: #f1f5f9; }
  #_fb_toolbar button.on { background: #3b82f6; color: #fff; }
  #_fb_toolbar button.on:hover { filter: brightness(1.15); }

  #_fb_toolbar .sep {
    width: 1px;
    height: 18px;
    background: #334155;
    margin: 0 2px;
    flex-shrink: 0;
  }

  #_fb_toolbar input[type="color"] {
    width: 20px;
    height: 20px;
    border: 2px solid #334155;
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
    background: none;
    -webkit-appearance: none;
    appearance: none;
  }
  #_fb_toolbar input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
  #_fb_toolbar input[type="color"]::-webkit-color-swatch { border: none; border-radius: 2px; }
`;

function buildInlineEditScript(tool: string): string {
  return `
<script>
(function() {
  var TOOL = '${tool}';

  // ── Alt + scroll → forward to parent for canvas zoom ──
  document.addEventListener('wheel', function(e) {
    if (!e.altKey) return;
    e.preventDefault();
    window.parent.postMessage({
      type: 'funnel:alt-wheel',
      deltaY: e.deltaY
    }, '*');
  }, { passive: false });

  // ── Container resize tracking ──
  if (TOOL === 'container' || TOOL === 'cursor') {
    var resizeObserved = new Map();
    var ro = new ResizeObserver(function(entries) {
      for (var entry of entries) {
        var el = entry.target;
        var elId = el.getAttribute('data-element');
        if (!elId) continue;
        var cs = window.getComputedStyle(el);
        if (cs.position !== 'absolute') continue;
        window.parent.postMessage({
          type: 'funnel:container-resize',
          elementId: elId,
          width: Math.round(entry.contentRect.width) + 'px',
          height: Math.round(entry.contentRect.height) + 'px'
        }, '*');
      }
    });
    document.querySelectorAll('.funnel-container-box').forEach(function(el) {
      ro.observe(el);
    });
  }

  // ── Inline editing (only for text tool, or dblclick in default mode) ──
  var editing = null;
  var tb = null;

  function createToolbar() {
    var d = document.createElement('div');
    d.id = '_fb_toolbar';
    d.innerHTML =
      '<button data-cmd="bold" title="Bold"><b>B</b></button>' +
      '<button data-cmd="italic" title="Italic"><i>I</i></button>' +
      '<button data-cmd="underline" title="Underline"><u>U</u></button>' +
      '<button data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>' +
      '<div class="sep"></div>' +
      '<button data-cmd="createLink" title="Link">&#128279;</button>' +
      '<div class="sep"></div>' +
      '<input type="color" value="#ffffff" title="Text color">';
    document.body.appendChild(d);

    d.addEventListener('mousedown', function(e) { e.preventDefault(); });

    d.querySelectorAll('button').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!editing) return;
        editing.focus();
        var cmd = btn.getAttribute('data-cmd');
        if (cmd === 'createLink') {
          var sel = window.getSelection();
          if (!sel || sel.isCollapsed) return;
          var url = prompt('URL:', 'https://');
          if (url) document.execCommand('createLink', false, url);
        } else {
          document.execCommand(cmd, false);
        }
        refreshBtnStates();
      });
    });

    d.querySelector('input[type="color"]').addEventListener('input', function(e) {
      if (!editing) return;
      editing.focus();
      document.execCommand('foreColor', false, e.target.value);
    });

    return d;
  }

  function refreshBtnStates() {
    if (!tb) return;
    tb.querySelectorAll('button[data-cmd]').forEach(function(btn) {
      var cmd = btn.getAttribute('data-cmd');
      if (cmd === 'createLink') return;
      try {
        btn.classList.toggle('on', document.queryCommandState(cmd));
      } catch(_) {}
    });
  }

  function showToolbar() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editing) { hideToolbar(); return; }
    if (!editing.contains(sel.anchorNode)) { hideToolbar(); return; }
    if (!tb) tb = createToolbar();
    var range = sel.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    var tbW = 220;
    var tbH = 34;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var top = rect.top - tbH - 4;
    if (top < 4) top = rect.bottom + 4;
    top = Math.max(4, Math.min(top, vh - tbH - 4));

    var left = rect.left + rect.width / 2 - tbW / 2;
    left = Math.max(4, Math.min(left, vw - tbW - 4));

    tb.style.top = top + 'px';
    tb.style.left = left + 'px';
    tb.classList.add('active');
    refreshBtnStates();
  }

  function hideToolbar() {
    if (tb) tb.classList.remove('active');
  }

  function startEdit(el) {
    if (editing && editing !== el) {
      editing.contentEditable = 'false';
      finishEdit(editing);
    }
    editing = el;
    el.contentEditable = 'true';
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    setTimeout(showToolbar, 50);
  }

  document.addEventListener('selectionchange', function() {
    if (!editing) return;
    showToolbar();
  });

  // Text tool: single click to edit
  if (TOOL === 'text') {
    document.addEventListener('click', function(e) {
      var el = e.target.closest('[data-editable="true"]');
      if (!el) return;
      if (el.contentEditable === 'true') return;
      e.preventDefault();
      e.stopPropagation();
      startEdit(el);
    });
  }

  // Default dblclick editing: only when NOT in cursor mode
  if (TOOL !== 'cursor') {
    document.addEventListener('dblclick', function(e) {
      var el = e.target.closest('[data-editable="true"]');
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      startEdit(el);
    });
  }

  document.addEventListener('keydown', function(e) {
    if (!editing) return;
    if (e.key === 'Escape') {
      editing.contentEditable = 'false';
      hideToolbar();
      editing = null;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      editing.contentEditable = 'false';
      hideToolbar();
      finishEdit(editing);
      editing = null;
    }
  });

  document.addEventListener('mousedown', function(e) {
    if (!editing) return;
    if (tb && tb.contains(e.target)) return;
    if (!editing.contains(e.target)) {
      editing.contentEditable = 'false';
      hideToolbar();
      finishEdit(editing);
      editing = null;
    }
  });

  function finishEdit(el) {
    var elId = el.getAttribute('data-element');
    if (!elId) {
      var p = el.closest('[data-element]');
      if (p) elId = p.getAttribute('data-element');
    }
    if (elId) {
      window.parent.postMessage({
        type: 'funnel:inline-edit',
        elementId: elId,
        content: el.innerHTML.trim()
      }, '*');
    }
  }

  // ── Container tool: draw rectangle on screen ──
  if (TOOL === 'container') {
    document.body.style.cursor = 'crosshair';
    var drawing = false;
    var drect = null;
    var sx = 0, sy = 0;

    document.addEventListener('mousedown', function(e) {
      if (e.target.closest('[data-element]')) return;
      e.preventDefault();
      drawing = true;
      sx = e.clientX;
      sy = e.clientY;
      drect = document.createElement('div');
      drect.style.position = 'fixed';
      drect.style.border = '2px dashed #3b82f6';
      drect.style.background = 'rgba(59,130,246,0.08)';
      drect.style.borderRadius = '4px';
      drect.style.zIndex = '99999';
      drect.style.pointerEvents = 'none';
      drect.style.left = sx + 'px';
      drect.style.top = sy + 'px';
      document.body.appendChild(drect);
    });

    document.addEventListener('mousemove', function(e) {
      if (!drawing || !drect) return;
      var x = Math.min(e.clientX, sx);
      var y = Math.min(e.clientY, sy);
      var w = Math.abs(e.clientX - sx);
      var h = Math.abs(e.clientY - sy);
      drect.style.left = x + 'px';
      drect.style.top = y + 'px';
      drect.style.width = w + 'px';
      drect.style.height = h + 'px';
    });

    document.addEventListener('mouseup', function(e) {
      if (!drawing) return;
      drawing = false;
      if (!drect) return;
      var w = Math.abs(e.clientX - sx);
      var h = Math.abs(e.clientY - sy);
      document.body.removeChild(drect);
      drect = null;
      if (w < 10 || h < 10) return;

      var screen = document.querySelector('.funnel-screen, main, body');
      var sr = screen ? screen.getBoundingClientRect() : { left: 0, top: 0 };
      var scrollY = window.scrollY || 0;
      var scrollX = window.scrollX || 0;

      window.parent.postMessage({
        type: 'funnel:container-create',
        x: Math.min(e.clientX, sx) - sr.left + scrollX,
        y: Math.min(e.clientY, sy) - sr.top + scrollY,
        width: w,
        height: h
      }, '*');
    });
  }
})();
</script>`;
}

// ── Overlay for cursor tool (like manager mode) ─────────────────────────────

type OverlayBox = {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

function MapElementOverlay({
  elementId,
  screenId,
  box,
  isSelected,
}: {
  elementId: string;
  screenId: string;
  box: OverlayBox;
  isSelected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: elementId,
    data: { type: 'element', screenId, parentId: null },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[
        styles.elemOverlay,
        isSelected ? styles.elemOverlaySelected : '',
        isDragging ? styles.elemOverlayDragging : '',
      ].join(' ')}
      style={{
        top: box.top * SCALE,
        left: box.left * SCALE,
        width: box.width * SCALE,
        height: box.height * SCALE,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={(e) => {
        e.stopPropagation();
        useFunnelStore.getState().selectElement(elementId, e.ctrlKey || e.metaKey);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      {...attributes}
      {...listeners}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface ScreenNodeData {
  label: string;
  screenType: string;
  order: number;
  mapTool: string;
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
  const selectedElementIds = useFunnelStore((state) => state.ui.selectedElementIds);

  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({ id });
  const hasElements = (elementIndexes.byScreen[id]?.length ?? 0) > 0;
  const activeTool = (nodeData.mapTool as string) || 'cursor';

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [overlayBoxes, setOverlayBoxes] = useState<OverlayBox[]>([]);

  const rootElementIds = useMemo(
    () => getElementOrderGroup(elementIndexes, id, null),
    [elementIndexes, id],
  );

  const html = useMemo(() => {
    if (!screen) return '';
    return getScreenHtml(id, elements, elementIndexes, screen, globalStyles);
  }, [screen, id, elements, elementIndexes, globalStyles]);

  const srcDoc = useMemo(() => {
    const doc = buildPreviewDocument(html);
    const editScript = buildInlineEditScript(activeTool);
    return doc
      .replace('</head>', `<style>${PREVIEW_STYLE}</style></head>`)
      .replace('</body>', `${editScript}</body>`);
  }, [html, activeTool]);

  // ── Overlay layout (read element positions from iframe DOM) ──────────────
  const recomputeLayout = useCallback(() => {
    if (activeTool !== 'cursor') { setOverlayBoxes([]); return; }
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc?.body) return;

    const bodyRect = doc.body.getBoundingClientRect();
    const boxes = rootElementIds
      .map((elId) => {
        const target = doc.querySelector<HTMLElement>(`[data-element="${elId}"]`);
        if (!target) return null;
        const rect = target.getBoundingClientRect();
        return {
          id: elId,
          top: rect.top - bodyRect.top,
          left: rect.left - bodyRect.left,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((b): b is OverlayBox => b !== null);

    setOverlayBoxes(boxes);
  }, [rootElementIds, activeTool]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let frame = 0;
    let ro: ResizeObserver | null = null;

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(recomputeLayout);
    };

    const observe = () => {
      ro?.disconnect();
      const doc = iframe.contentDocument;
      if (!doc?.documentElement) return;
      ro = new ResizeObserver(schedule);
      ro.observe(doc.documentElement);
      schedule();
    };

    observe();
    iframe.addEventListener('load', observe);
    return () => {
      iframe.removeEventListener('load', observe);
      ro?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [recomputeLayout, srcDoc]);

  // ── PostMessage handlers ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (!msg?.type) return;

      if (msg.type === 'funnel:inline-edit') {
        const { elementId, content } = msg;
        if (!elementId || typeof content !== 'string') return;
        const el = elements[elementId];
        if (el && el.screenId === id && content !== el.content) {
          useFunnelStore.getState().updateElement(elementId, { content });
        }
        return;
      }

      if (msg.type === 'funnel:alt-wheel') {
        window.dispatchEvent(new CustomEvent('funnel:alt-zoom', { detail: msg.deltaY }));
        return;
      }

      if (msg.type === 'funnel:container-create') {
        const { x, y, width, height } = msg;
        if (typeof x !== 'number') return;
        const containerId = `container-${nanoid(8)}`;
        const screenEls = (elementIndexes.byScreen[id] ?? []).map((eid) => elements[eid]).filter(Boolean);
        const maxOrder = screenEls.length > 0 ? Math.max(...screenEls.map((el) => el!.order)) + 1 : 0;
        useFunnelStore.getState().addElement({
          id: containerId,
          screenId: id,
          parentId: null,
          order: maxOrder,
          type: 'container',
          tag: 'div',
          classes: ['funnel-container-box'],
          content: '',
          styles: {
            position: 'absolute',
            left: `${Math.round(x)}px`,
            top: `${Math.round(y)}px`,
            width: `${Math.round(width)}px`,
            height: `${Math.round(height)}px`,
            background: 'rgba(59,130,246,0.1)',
            borderRadius: '8px',
            minHeight: '20px',
          },
          attributes: {},
          i18n: {},
          visibility: 'always',
          animation: 'none',
          locked: false,
          customCss: '',
          editable: false,
        });
        return;
      }

      if (msg.type === 'funnel:container-resize') {
        const { elementId, width, height } = msg;
        if (!elementId) return;
        const el = elements[elementId];
        if (el && el.screenId === id) {
          useFunnelStore.getState().updateElement(elementId, {
            styles: { ...el.styles, width, height },
          });
        }
        return;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [elements, elementIndexes, id]);

  const hasWarning =
    nodeData.isDeadEnd ||
    nodeData.isDuplicateDefault ||
    nodeData.isInCycle ||
    nodeData.isUnreachable;

  const iframePE = activeTool === 'cursor' ? 'none' : 'auto';

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

      {nodeData.isStart && (
        <div className={styles.startBadge} title="Start screen">START</div>
      )}

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

      <div
        ref={setDropRef}
        className={`${styles.phone} ${isDropOver ? styles.dropOver : ''}`}
      >
        <div className={styles.btnVolUp} />
        <div className={styles.btnVolDown} />
        <div className={styles.btnPower} />

        <div className={styles.screen}>
          <div className={styles.dynamicIsland} />

          <div className={styles.screenContent}>
            {hasElements ? (
              <>
                <iframe
                  ref={iframeRef}
                  className={styles.previewFrame}
                  style={{ pointerEvents: iframePE }}
                  srcDoc={srcDoc}
                  sandbox="allow-same-origin allow-scripts"
                  title={`Map preview: ${nodeData.label}`}
                />
                {activeTool === 'cursor' && overlayBoxes.length > 0 && (
                  <div className={styles.overlayLayer}>
                    <SortableContext items={rootElementIds} strategy={rectSortingStrategy}>
                      {overlayBoxes.map((box) => (
                        <MapElementOverlay
                          key={box.id}
                          elementId={box.id}
                          screenId={id}
                          box={box}
                          isSelected={selectedElementIds.includes(box.id)}
                        />
                      ))}
                    </SortableContext>
                  </div>
                )}
              </>
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
