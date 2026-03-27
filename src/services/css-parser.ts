export type CssRuleMap = Map<string, Record<string, string>>;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseDeclarations(block: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const part of block.split(';')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (name) props[name] = value;
  }
  return props;
}

export function parseCss(css: string): CssRuleMap {
  const map: CssRuleMap = new Map();
  const cleaned = stripComments(css);
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const selectors = m[1];
    const body = m[2];
    if (!selectors || body === undefined) continue;
    const decls = parseDeclarations(body);
    if (Object.keys(decls).length === 0) continue;
    for (const raw of selectors.split(',')) {
      const sel = raw.trim();
      if (!sel) continue;
      const prev = map.get(sel) ?? {};
      map.set(sel, { ...prev, ...decls });
    }
  }
  return map;
}
