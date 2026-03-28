import type {
  Funnel,
  Screen,
  FunnelElement,
  Connection,
  Block,
  GlobalStyles,
  CSSVariableName,
  ConditionGroup,
  ElementIndexes,
} from './funnel';
import type { UIState, HistoryState, Mode } from './ui';
import type { ProjectDocument } from './project';

// ── Root Application State ──

export interface AppState {
  project: ProjectDocument;
  ui: UIState;
  history: HistoryState;
  elementIndexes: ElementIndexes;
}

// ── Store Actions ──

export interface FunnelActions {
  updateMeta: (updates: Partial<Funnel['meta']>) => void;
  updateGlobalStyle: (variable: CSSVariableName, value: string) => void;
  updateGlobalStyles: (styles: Partial<GlobalStyles>) => void;

  addScreen: (screen: Screen) => void;
  addScreenWithElements: (screen: Screen, elements: FunnelElement[]) => void;
  deleteScreen: (screenId: string) => void;
  deleteScreens: (screenIds: string[]) => void;
  updateScreen: (screenId: string, updates: Partial<Screen>) => void;
  renameScreen: (oldSlug: string, newSlug: string) => void;
  moveScreen: (screenId: string, position: { x: number; y: number }) => void;
  batchMoveScreens: (positions: Record<string, { x: number; y: number }>) => void;
  reorderScreen: (screenId: string, newOrder: number) => void;
  duplicateScreen: (screenId: string) => string;
  importScreenFromHtml: (html: string, fileName?: string) => string;

  addElement: (element: FunnelElement) => void;
  addElementsBatch: (elements: FunnelElement[]) => void;
  deleteElement: (elementId: string) => void;
  updateElement: (elementId: string, updates: Partial<FunnelElement>) => void;
  updateElementStyle: (elementId: string, property: string, value: string) => void;
  moveElement: (elementId: string, targetScreenId: string, targetParentId: string | null, order: number) => void;
  duplicateElement: (elementId: string) => string;
  reorderElements: (screenId: string, orderedIds: string[], parentId?: string | null) => void;

  addConnection: (connection: Connection) => void;
  deleteConnection: (connectionId: string) => void;
  updateConnection: (connectionId: string, updates: Partial<Connection>) => void;

  addBlock: (block: Block) => void;
  deleteBlock: (blockId: string) => void;
  updateBlock: (blockId: string, updates: Partial<Block>) => void;
}

export interface UIActions {
  setMode: (mode: Mode) => void;
  selectScreen: (screenId: string, multi?: boolean) => void;
  selectElement: (elementId: string, multi?: boolean) => void;
  selectAllScreens: () => void;
  clearSelection: () => void;
  setLinkMode: (enabled: boolean) => void;
  setMapLocked: (locked: boolean) => void;
  updatePan: (pan: { x: number; y: number }) => void;
  updateScale: (scale: number) => void;
  togglePanel: (side: 'left' | 'right') => void;
  resizePanel: (side: 'left' | 'right', width: number) => void;
  setPreviewVisible: (visible: boolean) => void;
  setPreviewDevice: (device: 'mobile' | 'tablet' | 'desktop') => void;
  setGridSnap: (enabled: boolean) => void;
  setShowMinimap: (visible: boolean) => void;
  triggerRename: (screenId: string | null) => void;
  triggerIdFocus: (id: string | null) => void;
}

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setMaxHistoryEntries: (max: number) => void;
}

export interface ClipboardActions {
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
}

export interface ProjectActions {
  saveProject: () => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  createNewProject: (name?: string) => void;
  exportHtmlZip: () => Promise<Blob>;
  exportSingleFile: () => string;
}

// ── Combined Store Interface ──
// elementIndexes are auto-rebuilt via subscribe — no manual _rebuild needed

export interface FunnelStore extends AppState, FunnelActions, UIActions, HistoryActions, ClipboardActions, ProjectActions {}

// ── Connection Resolution (Logic #7) ──

export interface ConnectionResolutionResult {
  targetScreenId: string | null;
  connectionId: string | null;
  reason: 'condition_match' | 'default_fallback' | 'no_connection';
}

export type ResolveNextScreen = (
  screenId: string,
  connections: Connection[],
  evaluateCondition: (condition: ConditionGroup) => boolean,
) => ConnectionResolutionResult;

// ── Auto Progress Calculation (Logic #8) ──

export type CalculateAutoProgress = (
  currentScreenId: string,
  startScreenId: string,
  connections: Connection[],
) => number;
