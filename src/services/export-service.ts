import JSZip from 'jszip';
import type { FunnelElement } from '@typedefs/funnel';
import type { ProjectDocument } from '@typedefs/project';

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function globalCss(project: ProjectDocument): string {
  const lines = Object.entries(project.funnel.globalStyles)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `  ${k}: ${v};`);
  const screens = Object.values(project.funnel.screens)
    .map((s) => s.customStyles.customCss.trim())
    .filter(Boolean);
  return `:root {\n${lines.join('\n')}\n}\n\n${screens.join('\n\n')}`;
}

function screenElementsList(project: ProjectDocument, screenId: string): FunnelElement[] {
  return Object.values(project.funnel.elements).filter((e) => e.screenId === screenId);
}

function childrenOf(parentId: string | null, list: FunnelElement[]): FunnelElement[] {
  return list.filter((e) => e.parentId === parentId).sort((a, b) => a.order - b.order);
}

function renderFunnelElement(el: FunnelElement, list: FunnelElement[]): string {
  const tag = el.tag.toLowerCase();
  const styleEntries = Object.entries(el.styles).filter(([, v]) => v != null && v !== '');
  const styleStr = styleEntries.map(([k, v]) => `${k}: ${String(v)}`).join('; ');
  const styleAttr = styleStr ? ` style="${escAttr(styleStr)}"` : '';
  const classAttr = el.classes.length ? ` class="${escAttr(el.classes.join(' '))}"` : '';
  const idAttr = el.id ? ` id="${escAttr(el.id)}"` : '';
  const attrs = Object.entries(el.attributes)
    .map(([k, v]) => ` ${k}="${escAttr(String(v))}"`)
    .join('');
  const openHead = `<${tag}${idAttr}${classAttr}${styleAttr}${attrs}`;
  const kids = childrenOf(el.id, list);
  const inner = escText(el.content) + kids.map((c) => renderFunnelElement(c, list)).join('');
  if (VOID.has(tag)) return `${openHead} />`;
  return `${openHead}>${inner}</${tag}>`;
}

function renderScreenBody(project: ProjectDocument, screenId: string): string {
  const list = screenElementsList(project, screenId);
  return childrenOf(null, list).map((e) => renderFunnelElement(e, list)).join('');
}

function buildSingleFileHtml(project: ProjectDocument): string {
  const { funnel } = project;
  const lang = funnel.meta.lang || 'en';
  const title = escText(funnel.meta.title || funnel.meta.name);
  const headCode = funnel.meta.analytics.headCode?.trim() ?? '';
  const sections: string[] = [];
  const scripts: string[] = [];
  for (const screen of Object.values(funnel.screens).sort((a, b) => a.order - b.order)) {
    const { customJs } = screen;
    const body = renderScreenBody(project, screen.id);
    sections.push(
      `<section data-screen="${escAttr(screen.id)}" data-name="${escAttr(screen.name)}">${body}</section>`,
    );
    const parts = [customJs.onEnter, customJs.onLeave, customJs.customScript].filter(Boolean);
    if (parts.length) scripts.push(parts.join('\n'));
  }
  const css = globalCss(project);
  const scriptBlock = scripts.length ? `<script>\n${scripts.join('\n\n')}\n</script>` : '';
  return `<!DOCTYPE html>
<html lang="${escAttr(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>\n${css}\n</style>
${headCode}
</head>
<body>
${sections.join('\n')}
${scriptBlock}
</body>
</html>`;
}

export async function exportAsZip(project: ProjectDocument): Promise<Blob> {
  const zip = new JSZip();
  zip.file('project.json', JSON.stringify(project, null, 2));
  zip.file('index.html', buildSingleFileHtml(project));
  return zip.generateAsync({ type: 'blob' });
}

export function exportAsSingleFile(project: ProjectDocument): string {
  return buildSingleFileHtml(project);
}
