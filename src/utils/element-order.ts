import type { ElementIndexes } from '@typedefs/funnel';

export function getElementOrderGroupKey(screenId: string, parentId: string | null): string {
  return parentId ?? `__root__${screenId}`;
}

export function getElementOrderGroup(
  elementIndexes: ElementIndexes,
  screenId: string,
  parentId: string | null,
): string[] {
  return elementIndexes.byParent[getElementOrderGroupKey(screenId, parentId)] ?? [];
}
