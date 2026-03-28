import { memo, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import styles from './SortableElementRow.module.css';

interface SortableElementRowProps {
  elementId: string;
  screenId: string;
  abbr: string;
  content: string;
  isSelected: boolean;
}

export const SortableElementRow = memo(function SortableElementRow({
  elementId,
  screenId,
  abbr,
  content,
  isSelected,
}: SortableElementRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: elementId,
    data: { type: 'element', screenId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      useFunnelStore.getState().selectElement(elementId, e.ctrlKey || e.metaKey);
    },
    [elementId],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
    >
      <span
        className={styles.handle}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={10} />
      </span>
      <span className={styles.abbr}>{abbr}</span>
      <span className={styles.content}>{content}</span>
    </div>
  );
});
