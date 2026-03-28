import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFunnelStore } from '@store/funnel-store';
import { useShallow } from 'zustand/react/shallow';
import { getScreenHtml } from '@services/html-cache';
import type { FunnelElement } from '@typedefs/funnel';
import { getElementOrderGroup } from '@utils/element-order';
import { buildPreviewDocument } from '@utils/preview-document';
import styles from './ManagerScreenCanvas.module.css';

const EDITABLE_TYPES = new Set(['heading', 'paragraph', 'button', 'option', 'label', 'footer']);

type OverlayBox = {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

function RootElementOverlay({
  element,
  screenId,
  box,
  isSelected,
}: {
  element: FunnelElement;
  screenId: string;
  box: OverlayBox;
  isSelected: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id,
    data: {
      type: 'element',
      screenId,
      parentId: null,
    },
  });

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== element.content) {
      useFunnelStore.getState().updateElement(element.id, { content: trimmed });
    }
    setEditing(false);
  }, [editValue, element.id, element.content]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!EDITABLE_TYPES.has(element.type)) return;
    setEditValue(element.content ?? '');
    setEditing(true);
  }, [element.type, element.content]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <textarea
        ref={inputRef}
        className={styles.inlineEdit}
        style={{
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
        }}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[
        styles.overlay,
        isSelected ? styles.overlaySelected : '',
        isDragging ? styles.overlayDragging : '',
      ].join(' ')}
      style={{
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={(event) => {
        event.stopPropagation();
        useFunnelStore.getState().selectElement(element.id, event.ctrlKey || event.metaKey);
      }}
      onDoubleClick={handleDoubleClick}
      title={element.content || element.type}
      {...attributes}
      {...listeners}
    >
    </button>
  );
}

export function ManagerScreenCanvas({ screenId }: { screenId: string }) {
  const { screen, elements, elementIndexes, globalStyles, selectedElementIds } = useFunnelStore(
    useShallow((state) => ({
      screen: state.project.funnel.screens[screenId] ?? null,
      elements: state.project.funnel.elements,
      elementIndexes: state.elementIndexes,
      globalStyles: state.project.funnel.globalStyles,
      selectedElementIds: state.ui.selectedElementIds,
    })),
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [documentHeight, setDocumentHeight] = useState(0);
  const [overlayBoxes, setOverlayBoxes] = useState<OverlayBox[]>([]);

  const rootElementIds = useMemo(
    () => getElementOrderGroup(elementIndexes, screenId, null),
    [elementIndexes, screenId],
  );

  const html = useMemo(() => {
    if (!screen) return '';
    return getScreenHtml(screenId, elements, elementIndexes, screen, globalStyles);
  }, [screen, screenId, elements, elementIndexes, globalStyles]);

  const srcDoc = useMemo(() => buildPreviewDocument(html), [html]);
  const hasElements = (elementIndexes.byScreen[screenId]?.length ?? 0) > 0;

  const recomputeLayout = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;

    if (!iframe || !doc || !doc.body || !doc.documentElement) return;

    const nextHeight = Math.max(
      doc.body.scrollHeight,
      doc.body.offsetHeight,
      doc.documentElement.scrollHeight,
      doc.documentElement.offsetHeight,
      iframe.clientHeight,
    );

    const bodyRect = doc.body.getBoundingClientRect();
    const nextBoxes = rootElementIds
      .map((elementId) => {
        const target = doc.querySelector<HTMLElement>(`[data-element="${elementId}"]`);
        if (!target) return null;

        const rect = target.getBoundingClientRect();

        return {
          id: elementId,
          top: rect.top - bodyRect.top,
          left: rect.left - bodyRect.left,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((box): box is OverlayBox => box !== null);

    setDocumentHeight(nextHeight);
    setOverlayBoxes(nextBoxes);
  }, [rootElementIds]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let observedWindow: Window | null = null;
    let detachImages: Array<() => void> = [];

    const scheduleLayout = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(recomputeLayout);
    };

    const cleanupObservedDocument = () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      observedWindow?.removeEventListener('resize', scheduleLayout);
      observedWindow = null;
      detachImages.forEach((detach) => detach());
      detachImages = [];
    };

    const observeDocumentLayout = () => {
      cleanupObservedDocument();

      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win || !doc.body || !doc.documentElement) return;

      observedWindow = win;
      resizeObserver = new ResizeObserver(() => {
        scheduleLayout();
      });
      resizeObserver.observe(doc.documentElement);
      observedWindow.addEventListener('resize', scheduleLayout);

      detachImages = Array.from(doc.images).map((image) => {
        image.addEventListener('load', scheduleLayout);
        image.addEventListener('error', scheduleLayout);
        return () => {
          image.removeEventListener('load', scheduleLayout);
          image.removeEventListener('error', scheduleLayout);
        };
      });

      void doc.fonts?.ready.then(() => {
        scheduleLayout();
      });

      scheduleLayout();
    };

    observeDocumentLayout();
    iframe.addEventListener('load', observeDocumentLayout);

    return () => {
      iframe.removeEventListener('load', observeDocumentLayout);
      cleanupObservedDocument();
      window.cancelAnimationFrame(frame);
    };
  }, [recomputeLayout, srcDoc]);

  if (!screen) {
    return <div className={styles.empty}>Screen not found</div>;
  }

  return (
    <div
      className={styles.root}
      onClick={() => {
        useFunnelStore.getState().selectScreen(screenId, false);
      }}
    >
      {!hasElements ? (
        <div className={styles.empty}>Drop blocks in Map mode to build this screen</div>
      ) : (
        <div className={styles.viewport}>
          <div
            className={styles.document}
            style={documentHeight > 0 ? { height: documentHeight } : undefined}
          >
            <iframe
              ref={iframeRef}
              className={styles.iframe}
              style={documentHeight > 0 ? { height: documentHeight } : undefined}
              srcDoc={srcDoc}
              sandbox="allow-same-origin"
              title={`Manager preview: ${screen.name}`}
            />

            <SortableContext items={rootElementIds} strategy={rectSortingStrategy}>
              {overlayBoxes.map((box) => {
                const element = elements[box.id];
                if (!element) return null;

                return (
                  <RootElementOverlay
                    key={box.id}
                    element={element}
                    screenId={screenId}
                    box={box}
                    isSelected={selectedElementIds.includes(box.id)}
                  />
                );
              })}
            </SortableContext>
          </div>
        </div>
      )}
    </div>
  );
}
