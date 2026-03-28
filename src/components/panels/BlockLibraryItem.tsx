import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ManifestEntry } from '@typedefs/component';
import styles from './BlockLibraryItem.module.css';

interface BlockLibraryItemProps {
  entry: ManifestEntry;
}

export function BlockLibraryItem({ entry }: BlockLibraryItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: { componentId: entry.id, componentCategory: entry.category },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={styles.item}
      style={style}
      title={entry.description}
      {...listeners}
      {...attributes}
    >
      <span className={styles.name}>{entry.name}</span>
    </div>
  );
}
