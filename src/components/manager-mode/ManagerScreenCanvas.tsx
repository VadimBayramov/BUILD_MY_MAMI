import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFunnelStore } from '@store/funnel-store';
import { useShallow } from 'zustand/react/shallow';
import { getScreenHtml } from '@services/html-cache';
import type { FunnelElement } from '@typedefs/funnel';
import { getElementOrderGroup } from '@utils/element-order';
import { buildPreviewDocument } from '@utils/preview-document';
import { TextFormatToolbar } from '@components/shared/TextFormatToolbar';
import styles from './ManagerScreenCanvas.module.css';

const EDITABLE_TYPES = new Set([
  'heading', 'subtitle', 'paragraph', 'button', 'option',
  'label', 'footer', 'text-list', 'side-title', 'terms-title',
]);

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
  const editRef = useRef<HTMLDivElement>(null);
  const [toolbarAnchor, setToolbarAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const isTextEditable = EDITABLE_TYPES.has(element.type);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id,
    data: {
      type: 'element',
      screenId,
      parentId: null,
    },
  });

  const commitEdit = useCallback(() => {
    const el = editRef.current;
    if (!el) { setEditing(false); return; }
    const html = el.innerHTML.trim();
    if (html && html !== element.content) {
      useFunnelStore.getState().updateElement(element.id, { content: html });
    }
    setEditing(false);
    setToolbarAnchor(null);
  }, [element.id, element.content]);

  useEffect(() => {
    if (editing && editRef.current) {
      const el = editRef.current;
      el.innerHTML = element.content ?? '';
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing, element.content]);

  const updateToolbarPosition = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editRef.current?.contains(sel.anchorNode)) {
      setToolbarAnchor(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setToolbarAnchor({ top: rect.top, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!editing) return;
    document.addEventListener('selectionchange', updateToolbarPosition);
    return () => document.removeEventListener('selectionchange', updateToolbarPosition);
  }, [editing, updateToolbarPosition]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related?.closest('[data-fb-toolbar]')) return;
    commitEdit();
  }, [commitEdit]);

  if (editing) {
    return (
      <>
        <TextFormatToolbar anchorRect={toolbarAnchor} containerEl={editRef.current} />
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          className={styles.inlineEdit}
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            minHeight: box.height,
          }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commitEdit(); }
            if (e.key === 'Escape') { setEditing(false); setToolbarAnchor(null); }
          }}
        />
      </>
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[
        styles.overlay,
        isTextEditable ? styles.overlayEditable : '',
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
        if (isTextEditable && event.detail >= 2) {
          setEditing(true);
        }
      }}
      title={element.content || element.type}
      {...attributes}
      {...(isTextEditable ? {} : listeners)}
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
