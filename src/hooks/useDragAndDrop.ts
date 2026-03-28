import { useCallback } from 'react';
import { type DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { nanoid } from 'nanoid';
import { useFunnelStore } from '@store/funnel-store';
import { createDefaultScreen } from '@store/defaults';
import { componentRegistry } from '@services/component-registry';
import { ElementFactory } from '@services/element-factory';
import type { FunnelElement } from '@typedefs/funnel';
import { getElementOrderGroup } from '@utils/element-order';

interface BlockDragData {
  componentId: string;
  componentCategory?: string;
}

interface ElementDragData {
  type: 'element';
  screenId: string;
  parentId: string | null;
}

type DragData = BlockDragData | ElementDragData;

function isElementDrag(data: DragData | undefined): data is ElementDragData {
  return (data as ElementDragData)?.type === 'element';
}

export function useDragAndDrop() {
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const data = active.data.current as DragData | undefined;

    // ── Element reorder within a screen ──────────────────────────────────────
    if (isElementDrag(data)) {
      const { screenId, parentId } = data;
      if (active.id === over.id) return;

      const state = useFunnelStore.getState();
      const currentIds = getElementOrderGroup(state.elementIndexes, screenId, parentId);
      if (!currentIds) return;

      const oldIndex = currentIds.indexOf(String(active.id));
      const newIndex = currentIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(currentIds, oldIndex, newIndex);
      state.reorderElements(screenId, reordered, parentId);
      return;
    }

    // ── Block drag from library ────────────────────────────────────────────────
    const blockData = data as BlockDragData | undefined;
    if (!blockData) return;

    const overId = String(over.id);
    const state = useFunnelStore.getState();

    // ── Case A: dropped onto an existing screen → add elements to it ──────────
    if (overId !== 'canvas' && state.project.funnel.screens[overId]) {
      const targetScreenId = overId;
      const existingCount = state.elementIndexes.byScreen[targetScreenId]?.length ?? 0;

      if (blockData.componentId === 'raw-html') {
        const rawEl: FunnelElement = {
          id: `raw-html-${nanoid(8)}`,
          screenId: targetScreenId,
          parentId: null,
          order: existingCount,
          type: 'raw-html',
          tag: 'div',
          classes: ['funnel-raw-html'],
          content: '<!-- paste your HTML here -->',
          styles: { 'min-height': '48px', padding: '12px' },
          attributes: { 'data-editable': 'true', 'data-element-type': 'raw-html' },
          i18n: {},
          visibility: 'always',
          animation: 'none',
          locked: false,
          customCss: '',
          editable: true,
        };
        state.addElementsBatch([rawEl]);
        state.selectScreen(targetScreenId, false);
        return;
      }

      const def = await componentRegistry.getOrFetch(blockData.componentId);
      if (def) {
        const elements = ElementFactory.fromComponentDefinition(def, targetScreenId).map(
          (el, i) => ({ ...el, order: existingCount + i }),
        );
        state.addElementsBatch(elements);
      }
      state.selectScreen(targetScreenId, false);
      return;
    }

    // ── Case B: dropped on canvas → create new screen ────────────────────────
    if (overId !== 'canvas') return;

    const screens = Object.values(state.project.funnel.screens);
    const maxX = screens.length > 0 ? Math.max(...screens.map((s) => s.position.x)) : -350;
    const refY = screens.length > 0 ? screens[0]!.position.y : 100;
    const position = { x: maxX + 350, y: refY };
    const newId = `screen-${nanoid(6)}`;

    if (blockData.componentId === 'raw-html') {
      const newScreen = createDefaultScreen(newId, 'Raw HTML', 'custom', position, screens.length);
      const rawEl: FunnelElement = {
        id: `raw-html-${nanoid(8)}`,
        screenId: newId,
        parentId: null,
        order: 0,
        type: 'raw-html',
        tag: 'div',
        classes: ['funnel-raw-html'],
        content: '<!-- paste your HTML here -->',
        styles: { 'min-height': '48px', padding: '12px' },
        attributes: { 'data-editable': 'true', 'data-element-type': 'raw-html' },
        i18n: {},
        visibility: 'always',
        animation: 'none',
        locked: false,
        customCss: '',
        editable: true,
      };
      useFunnelStore.getState().addScreenWithElements(newScreen, [rawEl]);
      useFunnelStore.getState().selectScreen(newId, false);
      return;
    }

    const def = await componentRegistry.getOrFetch(blockData.componentId);
    if (def) {
      const elements = ElementFactory.fromComponentDefinition(def, newId);
      const newScreen = createDefaultScreen(newId, def.meta.component, 'custom', position, screens.length);
      useFunnelStore.getState().addScreenWithElements(newScreen, elements);
    } else {
      const newScreen = createDefaultScreen(newId, blockData.componentId, 'custom', position, screens.length);
      useFunnelStore.getState().addScreen(newScreen);
    }
    useFunnelStore.getState().selectScreen(newId, false);
  }, []);

  return { handleDragEnd };
}
