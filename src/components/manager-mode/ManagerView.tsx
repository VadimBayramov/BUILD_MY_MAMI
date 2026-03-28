import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import { useShallow } from 'zustand/react/shallow';
import { ManagerScreenCanvas } from './ManagerScreenCanvas';
import styles from './ManagerView.module.css';

export function ManagerView() {
  const { screens, selectedScreenIds } =
    useFunnelStore(
      useShallow((s) => ({
        screens:            s.project.funnel.screens,
        selectedScreenIds:  s.ui.selectedScreenIds,
      })),
    );

  const setMode = useFunnelStore((s) => s.setMode);
  const selectScreen = useFunnelStore((s) => s.selectScreen);

  const screenList = Object.values(screens).sort((a, b) => a.order - b.order);
  // If nothing selected, default to first screen
  const [localScreenId, setLocalScreenId] = useState<string | null>(null);
  const goTo = useCallback((id: string) => {
    setLocalScreenId(id);
    selectScreen(id, false);
  }, [selectScreen]);

  useEffect(() => {
    if (selectedScreenIds.length === 1 && selectedScreenIds[0]) {
      setLocalScreenId(selectedScreenIds[0]);
    } else if (localScreenId === null && screenList.length > 0) {
      goTo(screenList[0]!.id);
    }
  }, [selectedScreenIds, localScreenId, screenList, goTo]);

  const activeScreenId = localScreenId ?? screenList[0]?.id ?? null;
  const activeScreen = activeScreenId ? screens[activeScreenId] : null;

  const currentIdx = screenList.findIndex((s) => s.id === activeScreenId);
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < screenList.length - 1;

  // Escape → back to map
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeScreenId) {
        useFunnelStore.getState().selectScreen(activeScreenId, false);
        setMode('map');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('funnel:focus-node', { detail: activeScreenId }));
        }, 200);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeScreenId, setMode]);

  if (screenList.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No screens. Go back to Map and add one.</p>
        <button className={styles.backBtn} onClick={() => setMode('map')}>
          <ArrowLeft size={14} /> Back to Map
        </button>
      </div>
    );
  }

  return (
    <div className={styles.root}>

      {/* ── Back bar ── */}
      <div className={styles.backBar}>
        <button
          className={styles.backBtn}
          onClick={() => {
            if (!activeScreenId) {
              setMode('map');
              return;
            }

            useFunnelStore.getState().selectScreen(activeScreenId, false);
            setMode('map');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('funnel:focus-node', { detail: activeScreenId }));
            }, 200);
          }}
          title="Back to Map"
        >
          <ArrowLeft size={14} />
          Map
        </button>
        <div className={styles.screenNav}>
          <button
            className={styles.navBtn}
            onClick={() => canPrev && goTo(screenList[currentIdx - 1]!.id)}
            disabled={!canPrev}
            title="Previous screen"
          >
            <ChevronLeft size={15} />
          </button>
          <span className={styles.screenTitle}>
            {activeScreen?.name ?? '—'}
          </span>
          <button
            className={styles.navBtn}
            onClick={() => canNext && goTo(screenList[currentIdx + 1]!.id)}
            disabled={!canNext}
            title="Next screen"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <span className={styles.screenCounter}>{currentIdx + 1} / {screenList.length}</span>
      </div>

      {/* ── Centered phone ── */}
      <div className={styles.stage}>
        <div className={styles.phoneFrame}>
          {/* Side buttons */}
          <div className={styles.btnVolUp} />
          <div className={styles.btnVolDown} />
          <div className={styles.btnPower} />

          <div className={styles.phoneScreen}>
            <div className={styles.dynamicIsland} />
            {activeScreenId ? (
              <ManagerScreenCanvas screenId={activeScreenId} />
            ) : (
              <div className={styles.phoneEmpty}>
                No elements yet — drag blocks from the library in Map mode
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Screen chip row ── */}
      <div className={styles.chipRow}>
        {screenList.map((s, idx) => (
          <button
            key={s.id}
            className={`${styles.chip} ${s.id === activeScreenId ? styles.chipActive : ''}`}
            onClick={() => goTo(s.id)}
            title={s.name}
          >
            <span className={styles.chipIdx}>{idx + 1}</span>
            <span className={styles.chipName}>{s.name}</span>
          </button>
        ))}
      </div>

    </div>
  );
}
