import type { ComponentDefinition, ComponentManifest, ManifestEntry } from '@typedefs/component';

export class ComponentRegistry {
  private readonly byId = new Map<string, ComponentDefinition>();
  private manifestEntries: ManifestEntry[] = [];

  // ── Full ComponentDefinition (parsed HTML, used in Phase 3+) ─────────────

  register(definition: ComponentDefinition): void {
    this.byId.set(definition.meta.component, definition);
  }

  get(id: string): ComponentDefinition | undefined {
    return this.byId.get(id);
  }

  getByCategory(category: string): ComponentDefinition[] {
    return [...this.byId.values()].filter((d) => d.meta.category === category);
  }

  getAllCategories(): string[] {
    const s = new Set<string>();
    for (const d of this.byId.values()) s.add(d.meta.category);
    return [...s].sort();
  }

  // ── Manifest entries (lightweight, loaded at startup) ───────────────────

  loadFromManifest(manifest: ComponentManifest): void {
    this.manifestEntries = manifest.components;
  }

  getManifestEntries(): ManifestEntry[] {
    return this.manifestEntries;
  }

  getManifestByCategory(category: string): ManifestEntry[] {
    return this.manifestEntries.filter((e) => e.category === category);
  }

  getManifestCategories(): string[] {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const e of this.manifestEntries) {
      if (!seen.has(e.category)) {
        seen.add(e.category);
        order.push(e.category);
      }
    }
    return order;
  }

  /**
   * Search manifest entries by name, description, or tags.
   * Returns all entries when query is empty.
   */
  search(query: string): ManifestEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.manifestEntries;
    return this.manifestEntries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some((t) => t.includes(q)),
    );
  }
}

/** Singleton instance — initialised once by the app */
export const componentRegistry = new ComponentRegistry();
