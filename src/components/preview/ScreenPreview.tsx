import { useRef, useEffect, useState, useCallback } from 'react';
import { Smartphone, Tablet, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import { useShallow } from 'zustand/react/shallow';
import { getScreenHtml } from '@services/html-cache';
import { buildPreviewDocument } from '@utils/preview-document';
import styles from './ScreenPreview.module.css';

// ── Device presets ─────────────────────────────────────────────────────────

type Device = 'mobile' | 'tablet' | 'desktop';

const DEVICE: Record<Device, { width: number; label: string }> = {
  mobile:  { width: 375,  label: 'Mobile (375px)'  },
  tablet:  { width: 768,  label: 'Tablet (768px)'  },
  desktop: { width: 1200, label: 'Desktop (1200px)' },
};

// ── Component ──────────────────────────────────────────────────────────────

export function ScreenPreview() {
  const { screens, elements, elementIndexes, globalStyles, selectedScreenIds } =
    useFunnelStore(
      useShallow((s) => ({
        screens:         s.project.funnel.screens,
        elements:        s.project.funnel.elements,
        elementIndexes:  s.elementIndexes,
        globalStyles:    s.project.funnel.globalStyles,
        selectedScreenIds: s.ui.selectedScreenIds,
      })),
    );

  const [device, setDevice] = useState<Device>('mobile');
  const [activeId, setActiveId]   = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Sorted screen list
  const screenList = Object.values(screens).sort((a, b) => a.order - b.order);

  // Keep activeId in sync with canvas selection
  useEffect(() => {
    if (selectedScreenIds.length === 1 && selectedScreenIds[0]) {
      setActiveId(selectedScreenIds[0]);
    } else if (activeId === null && screenList.length > 0) {
      setActiveId(screenList[0]!.id);
    }
  }, [selectedScreenIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // If the active screen was deleted, fall back to first
  useEffect(() => {
    if (activeId && !screens[activeId] && screenList.length > 0) {
      setActiveId(screenList[0]!.id);
    }
  }, [screens, activeId, screenList]);

  // Scale iframe to fit the container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const deviceWidth = DEVICE[device].width;
      setScale(el.clientWidth / deviceWidth);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [device]);

  // Recompute scale when device changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setScale(el.clientWidth / DEVICE[device].width);
  }, [device]);

  // Generate HTML for the active screen
  const activeScreen = activeId ? screens[activeId] : null;
  const html = activeScreen && activeId
    ? getScreenHtml(activeId, elements, elementIndexes, activeScreen, globalStyles)
    : '';
  const srcDoc = buildPreviewDocument(html);

  // Screen navigation
  const currentIndex = screenList.findIndex((s) => s.id === activeId);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < screenList.length - 1;
  const goTo = useCallback((id: string) => setActiveId(id), []);
  const goPrev = useCallback(() => {
    if (canPrev) setActiveId(screenList[currentIndex - 1]!.id);
  }, [canPrev, screenList, currentIndex]);
  const goNext = useCallback(() => {
    if (canNext) setActiveId(screenList[currentIndex + 1]!.id);
  }, [canNext, screenList, currentIndex]);

  // Empty state
  if (screenList.length === 0) {
    return (
      <div className={styles.empty}>
        <Monitor size={32} strokeWidth={1} />
        <p>No screens yet</p>
        <small>Add a screen from the canvas to preview it here</small>
      </div>
    );
  }

  const deviceWidth  = DEVICE[device].width;
  const wrapperH     = containerRef.current
    ? containerRef.current.clientHeight / scale
    : 600 / scale;

  return (
    <div className={styles.root}>

      {/* ── Top bar: device switcher + screen nav ── */}
      <div className={styles.topBar}>
        <div className={styles.deviceGroup}>
          {(['mobile', 'tablet', 'desktop'] as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              title={DEVICE[d].label}
              className={`${styles.deviceBtn} ${device === d ? styles.deviceBtnActive : ''}`}
              onClick={() => setDevice(d)}
            >
              {d === 'mobile'  && <Smartphone size={13} />}
              {d === 'tablet'  && <Tablet     size={13} />}
              {d === 'desktop' && <Monitor    size={13} />}
            </button>
          ))}
        </div>

        <div className={styles.screenNav}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={goPrev}
            disabled={!canPrev}
            title="Previous screen"
          >
            <ChevronLeft size={13} />
          </button>
          <span className={styles.screenName} title={activeScreen?.name ?? ''}>
            {activeScreen?.name ?? '—'}
          </span>
          <button
            type="button"
            className={styles.navBtn}
            onClick={goNext}
            disabled={!canNext}
            title="Next screen"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ── Scaled iframe ── */}
      <div ref={containerRef} className={styles.canvasArea}>
        <div
          className={styles.frameWrapper}
          style={{
            width:           deviceWidth,
            height:          Math.round(wrapperH),
            transform:       `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <iframe
            key={`${activeId ?? 'none'}-${device}`}
            className={styles.iframe}
            srcDoc={srcDoc}
            sandbox=""
            title={`Preview: ${activeScreen?.name ?? 'Screen'}`}
          />
        </div>
      </div>

      {/* ── Screen list chips ── */}
      <div className={styles.chipList}>
        {screenList.map((screen, idx) => (
          <button
            key={screen.id}
            type="button"
            className={`${styles.chip} ${screen.id === activeId ? styles.chipActive : ''}`}
            onClick={() => goTo(screen.id)}
            title={screen.name}
          >
            <span className={styles.chipIdx}>{idx + 1}</span>
            <span className={styles.chipName}>{screen.name}</span>
          </button>
        ))}
      </div>

    </div>
  );
}
