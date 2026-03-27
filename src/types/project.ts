import type { Funnel } from './funnel';

export interface AssetReference {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  hash: string;
  storage: 'inline' | 'local' | 'remote';
  url: string;
}

export interface AssetManifest {
  assets: Record<string, AssetReference>;
}

export interface ProjectDocument {
  id: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  thumbnail: string;
  assets: AssetManifest;
  funnel: Funnel;
}
