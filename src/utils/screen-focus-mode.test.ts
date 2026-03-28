import { describe, expect, test } from 'vitest';
import { resolveSpaceMode } from './screen-focus-mode';

describe('resolveSpaceMode', () => {
  test('enters manager mode from map when a screen is selected', () => {
    expect(
      resolveSpaceMode({
        mode: 'map',
        selectedScreenId: 'screen-a',
        fallbackScreenId: null,
      }),
    ).toEqual({
      nextMode: 'manager',
      focusScreenId: 'screen-a',
    });
  });

  test('does nothing in map mode when no screen is selected', () => {
    expect(
      resolveSpaceMode({
        mode: 'map',
        selectedScreenId: null,
        fallbackScreenId: null,
      }),
    ).toBeNull();
  });

  test('returns to map mode and focuses the current screen', () => {
    expect(
      resolveSpaceMode({
        mode: 'manager',
        selectedScreenId: 'screen-b',
        fallbackScreenId: 'screen-a',
      }),
    ).toEqual({
      nextMode: 'map',
      focusScreenId: 'screen-b',
    });
  });

  test('uses fallback screen when manager mode has no explicit selection', () => {
    expect(
      resolveSpaceMode({
        mode: 'manager',
        selectedScreenId: null,
        fallbackScreenId: 'screen-c',
      }),
    ).toEqual({
      nextMode: 'map',
      focusScreenId: 'screen-c',
    });
  });
});
