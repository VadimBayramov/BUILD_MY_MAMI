/**
 * html-cache.ts — transient in-memory cache for generated screen HTML.
 *
 * Per §6.4 architecture:
 *  - NOT persisted (cleared on page reload)
 *  - NOT part of Undo/Redo state
 *  - Invalidated by store subscriber in funnel-store.ts whenever
 *    elements, screens, or globalStyles change
 *
 * Usage:
 *   const html = getScreenHtml(screenId, elements, indexes, screen, globals);
 *   invalidateScreenCache(screenId);   // call after any mutation
 *   invalidateAllCache();              // call after globalStyles change
 */

import type {
  FunnelElement,
  GlobalStyles,
  Screen,
  ElementIndexes,
} from '@typedefs/funnel';
import { generateScreenHtml } from './html-generator';

const cache = new Map<string, string>();

/**
 * Returns cached HTML for a screen, or generates + caches it on first call.
 */
export function getScreenHtml(
  screenId: string,
  elements: Record<string, FunnelElement>,
  elementIndexes: ElementIndexes,
  screen: Screen,
  globalStyles: GlobalStyles,
): string {
  const hit = cache.get(screenId);
  if (hit !== undefined) return hit;

  const html = generateScreenHtml(screenId, elements, elementIndexes, screen, globalStyles);
  cache.set(screenId, html);
  return html;
}

/** Drop the cached HTML for one screen (called when its elements or settings change). */
export function invalidateScreenCache(screenId: string): void {
  cache.delete(screenId);
}

/** Drop all cached HTML (called when globalStyles change — affects every screen). */
export function invalidateAllCache(): void {
  cache.clear();
}

/** Expose cache size for debugging / tests. */
export function getCacheSize(): number {
  return cache.size;
}
