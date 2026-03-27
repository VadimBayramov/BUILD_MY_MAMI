import type { ComponentDefinition } from '@typedefs/component';

export class ComponentRegistry {
  private readonly byId = new Map<string, ComponentDefinition>();

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
}
