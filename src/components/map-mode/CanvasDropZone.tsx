import { useDroppable } from '@dnd-kit/core';
import styles from './CanvasDropZone.module.css';

interface Props {
  isActive: boolean;
}

export function CanvasDropZone({ isActive }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

  if (!isActive) return null;

  return (
    <div
      ref={setNodeRef}
      className={`${styles.zone} ${isOver ? styles.over : ''}`}
    >
      {isOver && (
        <div className={styles.hint}>Drop to add screen</div>
      )}
    </div>
  );
}
