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
