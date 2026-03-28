import { describe, expect, test } from 'vitest';
import type { ElementIndexes } from '@typedefs/funnel';
import { getElementOrderGroup } from './element-order';

describe('getElementOrderGroup', () => {
  test('returns only root siblings for screen-level reordering', () => {
    const indexes: ElementIndexes = {
      byScreen: {
        'screen-1': ['container-1', 'heading-1', 'button-1'],
      },
      byParent: {
        '__root__screen-1': ['container-1', 'button-1'],
        'container-1': ['heading-1'],
      },
    };

    expect(getElementOrderGroup(indexes, 'screen-1', null)).toEqual([
      'container-1',
      'button-1',
    ]);
  });

  test('returns child siblings for nested container reordering', () => {
    const indexes: ElementIndexes = {
      byScreen: {
        'screen-1': ['container-1', 'heading-1', 'paragraph-1'],
      },
      byParent: {
        '__root__screen-1': ['container-1'],
        'container-1': ['heading-1', 'paragraph-1'],
      },
    };

    expect(getElementOrderGroup(indexes, 'screen-1', 'container-1')).toEqual([
      'heading-1',
      'paragraph-1',
    ]);
  });
});
