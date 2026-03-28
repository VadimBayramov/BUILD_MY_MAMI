import { useCallback } from 'react';
import { type DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { nanoid } from 'nanoid';
import { useFunnelStore } from '@store/funnel-store';
import { createDefaultScreen } from '@store/defaults';

interface BlockDragData {
  componentId: string;
  componentCategory?: string;
}

interface ElementDragData {
  type: 'element';
  screenId: string;
}

type DragData = BlockDragData | ElementDragData;

function isElementDrag(data: DragData | undefined): data is ElementDragData {
  return (data as ElementDragData)?.type === 'element';
}

export function useDragAndDrop() {
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const data = active.data.current as DragData | undefined;

    // ── Element reorder within a screen ──
    if (isElementDrag(data)) {
      const { screenId } = data;
      if (active.id === over.id) return;

      const state = useFunnelStore.getState();
      const currentIds = state.elementIndexes.byScreen[screenId];
      if (!currentIds) return;

      const oldIndex = currentIds.indexOf(String(active.id));
      const newIndex = currentIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(currentIds, oldIndex, newIndex);
      state.reorderElements(screenId, reordered);
      return;
    }

    // ── Block drag from library → canvas ──
    if (over.id !== 'canvas') return;

    const blockData = data as BlockDragData | undefined;
    if (!blockData) return;

    const state = useFunnelStore.getState();
    const screens = Object.values(state.project.funnel.screens);

    // Auto-position: place right of the rightmost screen
    const maxX = screens.length > 0
      ? Math.max(...screens.map((s) => s.position.x))
      : -350;
    const refY = screens.length > 0 ? screens[0]!.position.y : 100;
    const position = { x: maxX + 350, y: refY };

    const newId = `screen-${nanoid(6)}`;
    const newScreen = createDefaultScreen(
      newId,
      blockData.componentId,
      'custom',
      position,
      screens.length,
    );

    state.addScreen(newScreen);
    state.selectScreen(newId, false);
  }, []);

  return { handleDragEnd };
}
