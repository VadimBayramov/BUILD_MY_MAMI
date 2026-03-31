import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDndContext } from '@dnd-kit/core';
import { openFunnelPreview } from '@services/funnel-preview';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type OnConnect,
  type NodeChange,
  type Connection as RFConnection,
  type SelectionMode,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nanoid } from 'nanoid';
import { useFunnelStore } from '@store/funnel-store';
import { useShallow } from 'zustand/react/shallow';
import { createDefaultScreen } from '@store/defaults';
import { ScreenNode } from './ScreenNode';
import { ScreenEdge } from './ScreenEdge';
import { BlockNode } from './BlockNode';
import { CanvasControls } from './CanvasControls';
import { MapToolbar } from './MapToolbar';
import { MapToolPanel } from './MapToolPanel';
import { CanvasDropZone } from './CanvasDropZone';
import { HtmlFileDropZone } from './HtmlFileDropZone';
import { ContextMenu, type ContextMenuEntry } from '@components/shared/ContextMenu';
import { useContextMenu } from '@hooks/useContextMenu';
import type { Screen, Connection, Block, ScreenType } from '@typedefs/funnel';
import {
  validateConnections,
  shouldBeDefault,
  isDuplicateConnection,
} from '@utils/connection-validator';
import styles from './MapCanvas.module.css';

const SCREEN_TYPES: { value: ScreenType; label: string }[] = [
  { value: 'survey',   label: 'Survey'   },
  { value: 'question', label: 'Question' },
  { value: 'result',   label: 'Result'   },
  { value: 'loader',   label: 'Loader'   },
  { value: 'form',     label: 'Form'     },
  { value: 'paywall',  label: 'Paywall'  },
  { value: 'custom',   label: 'Custom'   },
];

function computeAutoLayoutPositions(
  screens: Record<string, Screen>,
  connections: Connection[],
  startScreenId: string,
): Record<string, { x: number; y: number }> {
  const screenIds = Object.keys(screens);
  if (screenIds.length === 0) return {};

  let rootId = startScreenId;

  if (!rootId || !screens[rootId]) {
    const incoming = new Set(connections.map((c) => c.to));
    const root = screenIds.find((id) => !incoming.has(id));
    rootId = root ?? screenIds.reduce((a, b) =>
      screens[a]!.order < screens[b]!.order ? a : b,
    );
  }

  if (!screens[rootId]) return {};

  const visited = new Set<string>();
  const layers: string[][] = [];
  const queue: { id: string; depth: number }[] = [{ id: rootId, depth: 0 }];
  visited.add(rootId);

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (!layers[depth]) layers[depth] = [];
    layers[depth]!.push(id);

    const outgoing = connections
      .filter((c) => c.from === id && screens[c.to] && !visited.has(c.to))
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

    for (const conn of outgoing) {
      visited.add(conn.to);
      queue.push({ id: conn.to, depth: depth + 1 });
    }
  }

  if (visited.size === 0) return {};

  const positions: Record<string, { x: number; y: number }> = {};
  const gapX = 350;
  const gapY = 260;
  const upShift = 20;

  for (let depth = 0; depth < layers.length; depth++) {
    const layer = layers[depth]!;
    const totalHeight = (layer.length - 1) * gapY;

    for (let i = 0; i < layer.length; i++) {
      positions[layer[i]!] = {
        x: depth * gapX,
        y: i * gapY - totalHeight / 2 - depth * upShift,
      };
    }
  }

  return positions;
}

const nodeTypes = { screen: ScreenNode, block: BlockNode };
const edgeTypes = { screen: ScreenEdge };
const MAP_SCREEN_NODE_WIDTH = 220;
const MAP_SCREEN_NODE_HEIGHT = 476;

function screensToNodes(
  screens: Record<string, Screen>,
  selectedScreenIds: string[],
  screenDiagnostics: ReturnType<typeof validateConnections>['screens'],
  mapTool?: string,
): Node[] {
  const selectedSet = new Set(selectedScreenIds);
  return Object.values(screens).map((screen) => {
    const diag = screenDiagnostics[screen.id];
    return {
      id: screen.id,
      type: 'screen',
      position: screen.position,
      selected: selectedSet.has(screen.id),
      data: {
        label: screen.name,
        screenType: screen.type,
        order: screen.order,
        mapTool: mapTool ?? 'cursor',
        isStart: diag?.statuses.has('start') ?? false,
        isDeadEnd: diag?.statuses.has('dead-end') ?? false,
        isDuplicateDefault: diag?.statuses.has('duplicate-default') ?? false,
        isInCycle: diag?.statuses.has('in-cycle') ?? false,
        isUnreachable: diag?.statuses.has('unreachable') ?? false,
      },
    };
  });
}

function blocksToNodes(blocks: Block[]): Node[] {
  return blocks.map((block) => ({
    id: block.id,
    type: 'block',
    position: block.position,
    selectable: true,
    draggable: true,
    data: {
      label: block.label,
      color: block.color,
      width: block.width,
      height: block.height,
      screenIds: block.screenIds,
    },
    style: { zIndex: -1 },
  }));
}

function connectionsToEdges(
  connections: Connection[],
  connDiagnostics: ReturnType<typeof validateConnections>['connections'],
): Edge[] {
  const EDGE_MARKER_COLORS: Record<string, string> = {
    'default-path': '#3b82f6',
    'conditional':  '#f59e0b',
    'plain':        '#3b82f6',
    'error':        '#f87171',
    'self-loop':    '#ef4444',
    'in-cycle':     '#f97316',
  };

  return connections.map((conn) => {
    const diag = connDiagnostics[conn.id];
    const status = diag?.status ?? 'plain';
    const markerColor = EDGE_MARKER_COLORS[status] ?? '#3b82f6';

    return {
      id: conn.id,
      type: 'screen',
      source: conn.from,
      target: conn.to,
      label: conn.label || undefined,
      animated: status === 'conditional',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: markerColor,
        width: 14,
        height: 14,
      },
      data: {
        status,
        errorReason: diag?.errorReason,
        label: conn.label,
      },
    };
  });
}

function MapCanvasInner() {
  const {
    screens,
    connections,
    blocks,
    selectedScreenIds,
    gridSnap,
    showMinimap,
    startScreenId,
    mapLocked,
  } = useFunnelStore(
    useShallow((s) => ({
      screens: s.project.funnel.screens,
      connections: s.project.funnel.connections,
      blocks: s.project.funnel.blocks ?? [],
      selectedScreenIds: s.ui.selectedScreenIds,
      gridSnap: s.ui.gridSnap,
      showMinimap: s.ui.showMinimap,
      startScreenId: s.project.funnel.meta.startScreenId,
      mapLocked: s.ui.mapLocked,
    })),
  );

  const [altPressed, setAltPressed] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltPressed(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltPressed(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ── Run validation on every change ──────────────────────────────────────
  const diagnostics = useMemo(
    () => validateConnections(screens, connections, startScreenId),
    [screens, connections, startScreenId],
  );

  const mapToolForNodes = useFunnelStore((s) => s.ui.mapTool);
  const screenNodes = useMemo(
    () => screensToNodes(screens, selectedScreenIds, diagnostics.screens, mapToolForNodes),
    [screens, selectedScreenIds, diagnostics.screens, mapToolForNodes],
  );
  const blockNodes = useMemo(() => blocksToNodes(blocks), [blocks]);
  const allNodes = useMemo(() => [...blockNodes, ...screenNodes], [blockNodes, screenNodes]);
  const flowEdges = useMemo(
    () => connectionsToEdges(connections, diagnostics.connections),
    [connections, diagnostics.connections],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => { setNodes(allNodes); }, [allNodes, setNodes]);
  useEffect(() => { setEdges(flowEdges); }, [flowEdges, setEdges]);

  // Keep up-to-date refs so the window-level keydown listener always sees
  // current nodes/edges without having to re-register on every render.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      for (const change of changes) {
        if (change.type === 'position' && change.position && !change.dragging) {
          if (change.id.startsWith('block-')) {
            useFunnelStore.getState().updateBlock(change.id, { position: change.position });
          } else {
            useFunnelStore.getState().moveScreen(change.id, change.position);
          }
        }
      }
    },
    [onNodesChange],
  );

  const handleConnect: OnConnect = useCallback(
    (connection: RFConnection) => {
      if (!connection.source || !connection.target) return;

      // Guard: no self-loops
      if (connection.source === connection.target) return;

      const current = useFunnelStore.getState().project.funnel.connections;

      // Guard: no exact duplicate from+to
      if (isDuplicateConnection(connection.source, connection.target, current)) return;

      // First outgoing → becomes the default path (green)
      const makeDefault = shouldBeDefault(connection.source, current);

      const newConn: Connection = {
        id: `conn-${nanoid(8)}`,
        from: connection.source,
        to: connection.target,
        trigger: 'option-click',
        condition: null,
        label: '',
        priority: 0,
        isDefault: makeDefault,
      };
      useFunnelStore.getState().addConnection(newConn);
    },
    [],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === 'block') return;
      useFunnelStore.getState().selectScreen(node.id, _event.ctrlKey || _event.metaKey);
    },
    [],
  );

  const handlePaneClick = useCallback(() => {
    useFunnelStore.getState().clearSelection();
  }, []);

  const handleSelectionEnd = useCallback(() => {
    const selected = nodes.filter((n) => n.selected && n.type === 'screen');
    if (selected.length > 0) {
      const state = useFunnelStore.getState();
      const currentIds = new Set(state.ui.selectedScreenIds);
      for (const n of selected) currentIds.add(n.id);
      useFunnelStore.setState({
        ui: { ...state.ui, selectedScreenIds: Array.from(currentIds) },
      });
    }
  }, [nodes]);

  // ── Global keyboard handler (Delete / F2 for canvas objects) ────────────
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const state = useFunnelStore.getState();
        const screenIds = state.ui.selectedScreenIds;
        const elementIds = state.ui.selectedElementIds;
        const currentEdges = edgesRef.current;
        const currentNodes = nodesRef.current;

        const selectedEdgeIds = currentEdges
          .filter((e) => e.selected)
          .map((e) => e.id);
        const selectedBlockIds = currentNodes
          .filter((n) => n.selected && n.type === 'block')
          .map((n) => n.id);

        const hasSelection =
          screenIds.length > 0 ||
          elementIds.length > 0 ||
          selectedEdgeIds.length > 0 ||
          selectedBlockIds.length > 0;
        if (!hasSelection) return;

        event.preventDefault();
        // Elements take priority — if elements are selected, delete only them
        if (elementIds.length > 0) {
          for (const elId of elementIds) state.deleteElement(elId);
          state.clearSelection();
          return;
        }
        if (screenIds.length > 0) state.deleteScreens(screenIds);
        for (const edgeId of selectedEdgeIds) state.deleteConnection(edgeId);
        for (const blockId of selectedBlockIds) state.deleteBlock(blockId);
        state.clearSelection();
      }

      // Ctrl+P — open funnel preview in new browser tab
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        const st = useFunnelStore.getState();
        openFunnelPreview(
          st.project.funnel.screens,
          st.project.funnel.elements,
          st.elementIndexes,
          st.project.funnel.globalStyles,
        );
        return;
      }

      // Ctrl+D — duplicate selected element (if any), otherwise screens
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        const state = useFunnelStore.getState();
        const elementIds = state.ui.selectedElementIds;
        if (elementIds.length > 0) {
          event.preventDefault();
          for (const elId of elementIds) state.duplicateElement(elId);
          return;
        }
        // fall through to the existing duplicate shortcut (handled in useKeyboardShortcuts)
      }

      if (event.key === 'F2') {
        const selectedBlocks = nodesRef.current.filter((n) => n.selected && n.type === 'block');
        if (selectedBlocks.length === 1) {
          window.dispatchEvent(new CustomEvent(`funnel:rename-block:${selectedBlocks[0]!.id}`));
          event.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Fit View (keyboard shortcut Ctrl+Shift+1 dispatches custom event) ───
  const { fitView, setCenter, getViewport, setViewport, zoomIn, zoomOut } = useReactFlow();

  // Ref for async access (WASD handler, etc.)
  const rfMethodsRef = useRef({ fitView, setCenter, getViewport, setViewport });
  rfMethodsRef.current = { fitView, setCenter, getViewport, setViewport };

  // ── WASD / Arrow navigation when map is locked ─────────────────────────
  useEffect(() => {
    if (!mapLocked) return;
    const PAN_STEP = 80;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      let dx = 0;
      let dy = 0;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')    dy = PAN_STEP;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown')  dy = -PAN_STEP;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  dx = PAN_STEP;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') dx = -PAN_STEP;

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        const rf = rfMethodsRef.current;
        const vp = rf.getViewport();
        rf.setViewport({ x: vp.x + dx, y: vp.y + dy, zoom: vp.zoom }, { duration: 150 });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mapLocked]);
  useEffect(() => {
    const handler = () => fitView({ padding: 0.3, duration: 300 });
    window.addEventListener('funnel:fit-view', handler);
    return () => window.removeEventListener('funnel:fit-view', handler);
  }, [fitView]);

  // ── Focus Node (Tab/Home/End/Space dispatch this to center view on a node) ──
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const nodeId: string = typeof detail === 'string' ? detail : detail?.nodeId;
      const requestedZoom: number | undefined = typeof detail === 'object' ? detail?.zoom : undefined;

      const screen = useFunnelStore.getState().project.funnel.screens[nodeId];
      if (screen) {
        const { zoom: currentZoom } = getViewport();
        const targetZoom = requestedZoom ?? Math.max(currentZoom, 0.75);
        setCenter(
          screen.position.x + MAP_SCREEN_NODE_WIDTH / 2,
          screen.position.y + MAP_SCREEN_NODE_HEIGHT / 2,
          { zoom: targetZoom, duration: 400 },
        );
        return;
      }

      fitView({ nodes: [{ id: nodeId }], padding: 0.4, duration: 400 });
    };
    window.addEventListener('funnel:focus-node', handler);
    return () => window.removeEventListener('funnel:focus-node', handler);
  }, [fitView, setCenter, getViewport]);

  // ── Auto Layout (Ctrl+Shift+L or toolbar button) ──────────────────────
  useEffect(() => {
    const handler = () => {
      const state = useFunnelStore.getState();
      const s = state.project.funnel;

      // If linkMode is on — auto-connect screens that have no outgoing connections yet,
      // ordered by screen.order (historical add-order). Re-reads connections each
      // iteration to see connections added in previous iterations, and skips pairs
      // that are already linked.
      if (state.ui.linkMode) {
        const sortedScreens = Object.values(s.screens).sort((a, b) => a.order - b.order);
        for (let i = 0; i < sortedScreens.length - 1; i++) {
          const from = sortedScreens[i]!;
          const to = sortedScreens[i + 1]!;
          const freshConns = useFunnelStore.getState().project.funnel.connections;
          // Only connect if `from` has no outgoing connections at all
          if (!freshConns.some((c) => c.from === from.id) &&
              !isDuplicateConnection(from.id, to.id, freshConns)) {
            useFunnelStore.getState().addConnection({
              id: `conn-${nanoid(8)}`,
              from: from.id,
              to: to.id,
              trigger: 'option-click',
              condition: null,
              label: '',
              priority: 0,
              isDefault: true,
            });
          }
        }
      }

      // Recalculate positions from the (now possibly updated) connections
      const fresh = useFunnelStore.getState().project.funnel;
      const positions = computeAutoLayoutPositions(fresh.screens, fresh.connections, fresh.meta.startScreenId);
      if (Object.keys(positions).length > 0) {
        useFunnelStore.getState().batchMoveScreens(positions);
        setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 50);
      }
    };
    window.addEventListener('funnel:auto-layout', handler);
    return () => window.removeEventListener('funnel:auto-layout', handler);
  }, [fitView]);

  // ── Context Menu ────────────────────────────────────────────────────────
  const { target: ctxTarget, open: openCtx, close: closeCtx } = useContextMenu();

  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault();
      if (node.type === 'screen') {
        openCtx({ kind: 'screen', screenId: node.id, x: e.clientX, y: e.clientY });
      } else if (node.type === 'block') {
        openCtx({ kind: 'block', blockId: node.id, x: e.clientX, y: e.clientY });
      }
    },
    [openCtx],
  );

  const onEdgeContextMenu = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      e.preventDefault();
      openCtx({ kind: 'edge', connectionId: edge.id, x: e.clientX, y: e.clientY });
    },
    [openCtx],
  );

  const onPaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault();
      openCtx({ kind: 'canvas', x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY });
    },
    [openCtx],
  );

  const ctxEntries = useMemo((): ContextMenuEntry[] => {
    if (!ctxTarget) return [];

    if (ctxTarget.kind === 'screen') {
      const { screenId } = ctxTarget;
      const state = useFunnelStore.getState();
      const otherScreens = Object.values(state.project.funnel.screens).filter(
        (s) => s.id !== screenId,
      );

      return [
        {
          type: 'item', id: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl+D',
          onClick: () => {
            useFunnelStore.getState().selectScreen(screenId, false);
            useFunnelStore.getState().duplicate();
          },
        },
        {
          type: 'item', id: 'rename', label: 'Rename', shortcut: 'F2',
          onClick: () => {
            useFunnelStore.getState().selectScreen(screenId, false);
            useFunnelStore.getState().triggerRename(screenId);
          },
        },
        { type: 'separator' },
        {
          type: 'item', id: 'copy', label: 'Copy', shortcut: 'Ctrl+C',
          onClick: () => {
            useFunnelStore.getState().selectScreen(screenId, false);
            useFunnelStore.getState().copy();
          },
        },
        {
          type: 'item', id: 'cut', label: 'Cut', shortcut: 'Ctrl+X',
          onClick: () => {
            useFunnelStore.getState().selectScreen(screenId, false);
            useFunnelStore.getState().cut();
          },
        },
        {
          type: 'item', id: 'paste', label: 'Paste', shortcut: 'Ctrl+V',
          disabled: state.ui.clipboard === null,
          onClick: () => useFunnelStore.getState().paste(),
        },
        { type: 'separator' },
        ...(otherScreens.length > 0
          ? [{
              type: 'submenu' as const, id: 'add-conn', label: 'Add Connection →',
              items: otherScreens.map((s) => ({
                type: 'item' as const, id: s.id, label: s.name,
                onClick: () => {
                  const current = useFunnelStore.getState().project.funnel.connections;
                  if (isDuplicateConnection(screenId, s.id, current)) return;
                  useFunnelStore.getState().addConnection({
                    id: `conn-${nanoid(8)}`,
                    from: screenId,
                    to: s.id,
                    trigger: 'option-click',
                    condition: null,
                    label: '',
                    priority: 0,
                    isDefault: shouldBeDefault(screenId, current),
                  });
                },
              })),
            }]
          : []),
        { type: 'separator' },
        {
          type: 'item', id: 'delete', label: 'Delete', shortcut: 'Del',
          onClick: () => useFunnelStore.getState().deleteScreen(screenId),
        },
      ];
    }

    if (ctxTarget.kind === 'block') {
      const { blockId } = ctxTarget;
      return [
        {
          type: 'item' as const, id: 'rename', label: 'Rename', shortcut: 'F2',
          onClick: () => {
            window.dispatchEvent(new CustomEvent(`funnel:rename-block:${blockId}`));
          },
        },
        {
          type: 'item' as const, id: 'color', label: 'Change Color',
          onClick: () => {
            // Trigger color picker via event on the BlockNode
            window.dispatchEvent(new CustomEvent(`funnel:pick-color-block:${blockId}`));
          },
        },
        { type: 'separator' as const },
        {
          type: 'item' as const, id: 'delete', label: 'Delete', shortcut: 'Del',
          onClick: () => useFunnelStore.getState().deleteBlock(blockId),
        },
      ];
    }

    if (ctxTarget.kind === 'edge') {
      const { connectionId } = ctxTarget;
      return [
        {
          type: 'item', id: 'set-default', label: 'Set as Default',
          onClick: () => useFunnelStore.getState().updateConnection(connectionId, { isDefault: true }),
        },
        {
          type: 'item', id: 'add-condition', label: 'Add Condition…', disabled: true,
          onClick: () => {},
        },
        { type: 'separator' },
        {
          type: 'item', id: 'delete', label: 'Delete', shortcut: 'Del',
          onClick: () => useFunnelStore.getState().deleteConnection(connectionId),
        },
      ];
    }

    // kind === 'canvas'
    const state = useFunnelStore.getState();
    return [
      {
        type: 'item', id: 'paste', label: 'Paste', shortcut: 'Ctrl+V',
        disabled: state.ui.clipboard === null,
        onClick: () => useFunnelStore.getState().paste(),
      },
      {
        type: 'submenu', id: 'add-screen', label: 'Add Screen',
        items: SCREEN_TYPES.map((t) => ({
          type: 'item' as const, id: t.value, label: t.label,
          onClick: () => {
            const s = useFunnelStore.getState();
            const allScreens = Object.values(s.project.funnel.screens);
            const maxX = allScreens.length > 0
              ? Math.max(...allScreens.map((sc) => sc.position.x))
              : -350;
            const refY = allScreens[0]?.position.y ?? 100;
            const newId = `screen-${nanoid(6)}`;
            const newScreen = createDefaultScreen(newId, t.label, t.value, { x: maxX + 350, y: refY }, allScreens.length);
            s.addScreen(newScreen);
            s.selectScreen(newId, false);
          },
        })),
      },
      { type: 'separator' },
      {
        type: 'item', id: 'fit-view', label: 'Fit View', shortcut: 'Ctrl+Shift+1',
        onClick: () => fitView({ padding: 0.3, duration: 300 }),
      },
    ];
  }, [ctxTarget, fitView]);

  // ── Alt + scroll → zoom canvas instead of browser ──────────────────────
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.altKey) return;
      e.preventDefault();
      if (e.deltaY < 0) void zoomIn({ duration: 100 });
      else void zoomOut({ duration: 100 });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoomIn, zoomOut]);

  // ── Alt+scroll forwarded from iframes via postMessage ─────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const deltaY = (e as CustomEvent).detail;
      if (typeof deltaY !== 'number') return;
      if (deltaY < 0) void zoomIn({ duration: 100 });
      else void zoomOut({ duration: 100 });
    };
    window.addEventListener('funnel:alt-zoom', handler);
    return () => window.removeEventListener('funnel:alt-zoom', handler);
  }, [zoomIn, zoomOut]);

  const { active: dndActive } = useDndContext();
  // Show CanvasDropZone only for block drags (from BlockLibrary), not element row reorder drags
  const isDraggingBlock = dndActive !== null && dndActive.data?.current?.type !== 'element';

  const mapTool = useFunnelStore((s) => s.ui.mapTool);
  const panOnDrag = mapLocked ? false : !altPressed;
  const selectionOnDrag = mapLocked ? false : altPressed;

  return (
    <div className={styles.canvasWrap} ref={canvasWrapRef} tabIndex={-1}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={handlePaneClick}
        onSelectionEnd={handleSelectionEnd}
        zoomOnScroll={!mapLocked}
        zoomOnPinch={!mapLocked}
        zoomOnDoubleClick={!mapLocked}
        panOnDrag={panOnDrag}
        selectionOnDrag={selectionOnDrag}
        selectionMode={'partial' as SelectionMode}
        selectNodesOnDrag={false}
        nodesDraggable={!mapLocked}
        nodesConnectable={!mapLocked}
        minZoom={0.1}
        maxZoom={3}
        snapToGrid={gridSnap}
        snapGrid={[16, 16]}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        connectionMode={ConnectionMode.Loose}
        panActivationKeyCode={null}
        deleteKeyCode={null}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        {showMinimap && (
          <MiniMap
            style={{ background: '#1a1d24' }}
            maskColor="rgba(0,0,0,0.6)"
            nodeColor={(node) => {
              if (node.type === 'block') return (node.data as { color?: string }).color ?? '#374151';
              return '#3b82f6';
            }}
            pannable
            zoomable
          />
        )}
        <CanvasControls />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2d3139" />
        <Panel position="top-left">
          <div className={styles.topBar}>
            <div className={styles.zoomInfo}>
              Screens: {Object.keys(screens).length}
            </div>
            <MapToolbar />
          </div>
        </Panel>
      </ReactFlow>
      <MapToolPanel />
      <CanvasDropZone isActive={isDraggingBlock} />
      <HtmlFileDropZone />
      {ctxTarget && (
        <ContextMenu
          entries={ctxEntries}
          x={ctxTarget.x}
          y={ctxTarget.y}
          onClose={closeCtx}
        />
      )}
    </div>
  );
}

export function MapCanvas() {
  return (
    <ReactFlowProvider>
      <MapCanvasInner />
    </ReactFlowProvider>
  );
}
