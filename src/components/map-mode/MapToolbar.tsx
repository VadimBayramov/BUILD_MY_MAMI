import { useEffect, useCallback } from 'react';
import { Link2, Link2Off, Group, Wand2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useFunnelStore } from '@store/funnel-store';
import styles from './MapToolbar.module.css';

const BLOCK_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function MapToolbar() {
  const linkMode = useFunnelStore((s) => s.ui.linkMode);
  const setLinkMode = useFunnelStore((s) => s.setLinkMode);

  const handleCreateBlock = useCallback(() => {
    const state = useFunnelStore.getState();
    const { selectedScreenIds } = state.ui;
    if (selectedScreenIds.length === 0) return;

    const selectedScreens = selectedScreenIds
      .map((id) => state.project.funnel.screens[id])
      .filter(Boolean);

    const xs = selectedScreens.map((s) => s!.position.x);
    const ys = selectedScreens.map((s) => s!.position.y);
    const padding = 40;
    const nodeWidth = 180;
    const nodeHeight = 200;

    const minX = Math.min(...xs) - padding;
    const minY = Math.min(...ys) - padding - 30;
    const maxX = Math.max(...xs) + nodeWidth + padding;
    const maxY = Math.max(...ys) + nodeHeight + padding;

    const existingCount = state.project.funnel.blocks.length;
    const color = BLOCK_COLORS[existingCount % BLOCK_COLORS.length]!;

    useFunnelStore.getState().addBlock({
      id: `block-${nanoid(6)}`,
      label: 'New Block',
      color,
      screenIds: [...selectedScreenIds],
      position: { x: minX, y: minY },
      width: maxX - minX,
      height: maxY - minY,
    });
  }, []);

  useEffect(() => {
    const handler = () => handleCreateBlock();
    window.addEventListener('funnel:group-block', handler);
    return () => window.removeEventListener('funnel:group-block', handler);
  }, [handleCreateBlock]);

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={`${styles.btn} ${linkMode ? styles.active : ''}`}
        onClick={() => setLinkMode(!linkMode)}
        title={linkMode ? 'Автосвязка: ВКЛ' : 'Автосвязка: ВЫКЛ'}
      >
        {linkMode ? <Link2 size={16} /> : <Link2Off size={16} />}
        <span className={styles.label}>Link</span>
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={handleCreateBlock}
        title="Объединить выделенные экраны в блок"
      >
        <Group size={16} />
        <span className={styles.label}>Block</span>
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={() => window.dispatchEvent(new CustomEvent('funnel:auto-layout'))}
        title="Авто-раскладка экранов по цепочке (Ctrl+Shift+L)"
      >
        <Wand2 size={16} />
        <span className={styles.label}>Layout</span>
      </button>
    </div>
  );
}
