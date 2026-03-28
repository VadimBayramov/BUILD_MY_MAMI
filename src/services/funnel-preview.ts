/**
 * funnel-preview.ts
 *
 * Generates a standalone HTML page that shows all funnel screens in a
 * navigable single-page app and opens it in a new browser tab.
 *
 * Each screen is rendered using the existing html-generator service so the
 * output is identical to what the real funnel will produce.
 */

import type { Screen, FunnelElement, GlobalStyles, ElementIndexes } from '@typedefs/funnel';
import { generateScreenHtml } from './html-generator';

// ── Navigation script injected into the preview page ──────────────────────

const NAV_SCRIPT = /* html */`
<script>
(function () {
  var screens = document.querySelectorAll('[data-screen]');
  var list    = Array.from(screens).map(function(s){ return s.getAttribute('data-screen'); });
  var current = 0;

  function show(idx) {
    current = Math.max(0, Math.min(idx, list.length - 1));
    screens.forEach(function(s, i){ s.style.display = i === current ? '' : 'none'; });
    document.getElementById('fb-nav-label').textContent =
      (current + 1) + ' / ' + list.length + '  — ' + (list[current] || '');
    document.getElementById('fb-prev').disabled = current === 0;
    document.getElementById('fb-next').disabled = current === list.length - 1;
  }

  document.getElementById('fb-prev').addEventListener('click', function(){ show(current - 1); });
  document.getElementById('fb-next').addEventListener('click', function(){ show(current + 1); });

  // Keyboard: ← → arrows
  document.addEventListener('keydown', function(e){
    if (e.key === 'ArrowLeft')  show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  show(0);
})();
</script>`;

// ── Nav bar styles ─────────────────────────────────────────────────────────

const NAV_STYLES = /* css */`
  #fb-nav {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(15,15,20,0.88);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 40px;
    padding: 8px 20px;
    font-family: system-ui, sans-serif;
    font-size: 13px;
    color: #fff;
    z-index: 9999;
    user-select: none;
  }
  #fb-nav button {
    border: none;
    background: rgba(255,255,255,0.1);
    color: #fff;
    border-radius: 20px;
    padding: 4px 14px;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.15s;
  }
  #fb-nav button:hover:not(:disabled)  { background: rgba(255,255,255,0.22); }
  #fb-nav button:disabled              { opacity: 0.3; cursor: default; }
  #fb-nav-label                        { min-width: 140px; text-align: center; opacity: 0.8; }
`;

// ── Main generator ─────────────────────────────────────────────────────────

export function openFunnelPreview(
  screens: Record<string, Screen>,
  elements: Record<string, FunnelElement>,
  elementIndexes: ElementIndexes,
  globalStyles: GlobalStyles,
  _startScreenId?: string,
): void {
  const sorted = Object.values(screens).sort((a, b) => a.order - b.order);
  if (sorted.length === 0) return;

  // Render each screen
  const screenChunks = sorted.map((screen) =>
    generateScreenHtml(screen.id, elements, elementIndexes, screen, globalStyles),
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Funnel Preview</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; min-height: 100%; font-family: system-ui, sans-serif; }
  .funnel-screen { min-height: 100vh; }
  ${NAV_STYLES}
</style>
</head>
<body>

${screenChunks.join('\n\n')}

<nav id="fb-nav">
  <button id="fb-prev">&#8592; Prev</button>
  <span id="fb-nav-label"></span>
  <button id="fb-next">Next &#8594;</button>
</nav>

${NAV_SCRIPT}

</body>
</html>`;

  // Open in a new tab via Blob URL
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const tab  = window.open(url, '_blank');

  // Revoke the blob URL after the tab has had time to load
  if (tab) {
    tab.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
