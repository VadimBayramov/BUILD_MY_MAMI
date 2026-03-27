import type { Patch } from 'immer';
import type { Screen, FunnelElement } from './funnel';

export type Mode = 'map' | 'manager' | 'developer';

export interface PanelConfig {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  collapsible: boolean;
  resizable: boolean;
}

export type ManagerTab = 'preview' | 'translations' | 'payments';

export interface UIState {
  mode: Mode;
  selectedScreenIds: string[];
  selectedElementIds: string[];
  draggedItem: DraggedItem | null;
  clipboard: ClipboardData | null;
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  mapPan: { x: number; y: number };
  mapScale: number;
  gridSnap: boolean;
  showMinimap: boolean;
  showConnections: boolean;
  previewVisible: boolean;
  previewDevice: 'mobile' | 'tablet' | 'desktop';
  previewLocale: string;
  managerTab: ManagerTab;
}

export interface DraggedItem {
  type: 'block' | 'element' | 'screen';
  id: string;
  sourceScreenId?: string;
}

export type ClipboardData =
  | { type: 'element'; elements: FunnelElement[] }
  | { type: 'screen'; screen: Screen; elements: FunnelElement[] };

export interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
  description: string;
  timestamp: number;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxEntries: number;
}
