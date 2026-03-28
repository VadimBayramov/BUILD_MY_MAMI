import type { Mode } from '@typedefs/ui';

export interface SpaceModeResult {
  nextMode: Mode;
  focusScreenId: string | null;
}

interface ResolveSpaceModeParams {
  mode: Mode;
  selectedScreenId: string | null;
  fallbackScreenId: string | null;
}

export function resolveSpaceMode({
  mode,
  selectedScreenId,
  fallbackScreenId,
}: ResolveSpaceModeParams): SpaceModeResult | null {
  if (mode === 'map') {
    if (!selectedScreenId) return null;

    return {
      nextMode: 'manager',
      focusScreenId: selectedScreenId,
    };
  }

  if (mode === 'manager') {
    const focusScreenId = selectedScreenId ?? fallbackScreenId;
    if (!focusScreenId) return null;

    return {
      nextMode: 'map',
      focusScreenId,
    };
  }

  return null;
}
