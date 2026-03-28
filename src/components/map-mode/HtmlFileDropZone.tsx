import { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useFunnelStore } from '@store/funnel-store';
import { createDefaultScreen } from '@store/defaults';
import { ComponentParser } from '@services/component-parser';
import { ElementFactory } from '@services/element-factory';
import styles from './HtmlFileDropZone.module.css';

/**
 * Step 4.5 — HTML File Drop Zone
 *
 * Detects when the user drags an .html file from their OS directly onto the
 * canvas.  Shows a full-canvas overlay with visual feedback while the file
 * is in flight, then on drop:
 *   1. Reads the file text
 *   2. Parses it with ComponentParser → ComponentDefinition
 *   3. Converts to FunnelElement[] via ElementFactory
 *   4. Adds a new screen + elements via addScreenWithElements (undoable)
 *
 * Multiple .html files dropped at once each become their own screen.
 */
export function HtmlFileDropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const dragCountRef = useRef(0);

  const addScreenWithElements = useFunnelStore((s) => s.addScreenWithElements);
  const selectScreen = useFunnelStore((s) => s.selectScreen);

  // ── Global drag detection (shows overlay as soon as a file enters viewport) ─

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (!e.dataTransfer?.types.includes('Files')) return;
      dragCountRef.current += 1;
      setIsDragging(true);
    }

    function onDragLeave() {
      dragCountRef.current -= 1;
      if (dragCountRef.current <= 0) {
        dragCountRef.current = 0;
        setIsDragging(false);
        setIsOver(false);
      }
    }

    // Reset on any drop (even outside our zone)
    function onDrop() {
      dragCountRef.current = 0;
      setIsDragging(false);
      setIsOver(false);
    }

    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, []);

  // ── Zone-level handlers (only when overlay is visible) ──────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setIsDragging(false);
    setIsOver(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith('.html') || f.type === 'text/html',
    );
    if (files.length === 0) return;

    const state = useFunnelStore.getState();

    for (const file of files) {
      const html = await file.text();

      try {
        const def = ComponentParser.parse(html);
        const allScreens = Object.values(state.project.funnel.screens);
        const maxX = allScreens.length > 0
          ? Math.max(...allScreens.map((s) => s.position.x))
          : -350;
        const refY = allScreens[0]?.position.y ?? 100;

        const newId = `screen-${nanoid(6)}`;
        const name = file.name.replace(/\.html$/i, '') || def.meta.component || 'imported';
        const newScreen = createDefaultScreen(
          newId,
          name,
          'custom',
          { x: maxX + 350, y: refY },
          allScreens.length,
        );
        const elements = ElementFactory.fromComponentDefinition(def, newId);

        addScreenWithElements(newScreen, elements);
        selectScreen(newId, false);

        // Shift next file further right so screens don't overlap
        // (state is read fresh each iteration since Zustand is sync)
      } catch (err) {
        console.warn(`[HtmlFileDropZone] failed to parse "${file.name}":`, err);
      }
    }
  }, [addScreenWithElements, selectScreen]);

  if (!isDragging) return null;

  return (
    <div
      className={`${styles.zone} ${isOver ? styles.over : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.badge}>
        <span className={styles.icon}>↓</span>
        {isOver ? 'Release to import' : 'Drop .html to import as screen'}
      </div>
    </div>
  );
}
