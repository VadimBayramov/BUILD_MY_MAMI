export interface ComponentMeta {
  component: string;
  category: string;
  tags: string[];
  description: string;
  thumbnail: string;
  version: string;
}

export interface ComponentDefinition {
  meta: ComponentMeta;
  html: string;
  styles: string;
  scripts: string;
  elementTree: ElementNode;
}

export interface ElementNode {
  tag: string;
  id: string | null;
  classes: string[];
  attributes: Record<string, string>;
  styles: Record<string, string>;
  content: string | null;
  children: ElementNode[];
}

/** Lightweight entry loaded from component-manifest.json */
export interface ManifestEntry {
  id: string;
  category: string;
  tags: string[];
  name: string;
  description: string;
  /** Relative path inside block-library/, null for virtual blocks like raw-html */
  file: string | null;
  thumbnail: string | null;
}

export interface ComponentManifest {
  version: number;
  components: ManifestEntry[];
}
