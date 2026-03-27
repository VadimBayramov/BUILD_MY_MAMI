import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  ConnectionMode,
  useNodesState,
  useEdgesState,
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
import { ScreenNode } from './ScreenNode';
import { ScreenEdge } from './ScreenEdge';
import { BlockNode } from './BlockNode';
import { CanvasControls } from './CanvasControls';
import { MapToolbar } from './MapToolbar';
import type { Screen, Connection, Block } from '@typedefs/funnel';
import styles from './MapCanvas.module.css';

const nodeTypes = { screen: ScreenNode, block: BlockNode };
const edgeTypes = { screen: ScreenEdge };

function screensToNodes(
  screens: Record<string, Screen>,
  selectedScreenIds: string[],
): Node[] {
  const selectedSet = new Set(selectedScreenIds);
  return Object.values(screens).map((screen) => ({
    id: screen.id,
    type: 'screen',
    position: screen.position,
    selected: selectedSet.has(screen.id),
    data: {
      label: screen.name,
      screenType: screen.type,
      order: screen.order,
    },
  }));
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

function connectionsToEdges(connections: Connection[]): Edge[] {
  return connections.map((conn) => ({
    id: conn.id,
    type: 'screen',
    source: conn.from,
    target: conn.to,
    label: conn.label || undefined,
    animated: !!conn.condition,
    style: { stroke: conn.condition ? '#f59e0b' : '#3b82f6', strokeWidth: 2 },
  }));
}

function MapCanvasInner() {
  const {
    screens,
    connections,
    blocks,
    selectedScreenIds,
    gridSnap,
    showMinimap,
  } = useFunnelStore(
    useShallow((s) => ({
      screens: s.project.funnel.screens,
      connections: s.project.funnel.connections,
      blocks: s.project.funnel.blocks ?? [],
      selectedScreenIds: s.ui.selectedScreenIds,
      gridSnap: s.ui.gridSnap,
      showMinimap: s.ui.showMinimap,
    })),
  );

  const [altPressed, setAltPressed] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltPressed(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltPressed(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const screenNodes = useMemo(
    () => screensToNodes(screens, selectedScreenIds),
    [screens, selectedScreenIds],
  );
  const blockNodes = useMemo(() => blocksToNodes(blocks), [blocks]);
  const allNodes = useMemo(() => [...blockNodes, ...screenNodes], [blockNodes, screenNodes]);
  const flowEdges = useMemo(() => connectionsToEdges(connections), [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes(allNodes);
  }, [allNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

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
      const newEdge = {
        id: `conn-${nanoid(8)}`,
        from: connection.source,
        to: connection.target,
        trigger: 'option-click' as const,
        condition: null,
        label: '',
        priority: 0,
        isDefault: true,
      };
      useFunnelStore.getState().addConnection(newEdge);
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

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const state = useFunnelStore.getState();
        const screenIds = state.ui.selectedScreenIds;

        const selectedEdgeIds = state.project.funnel.connections
          .filter((c) => edges.some((edge) => edge.id === c.id && edge.selected))
          .map((c) => c.id);

        if (screenIds.length > 0) {
          useFunnelStore.getState().deleteScreens(screenIds);
        }

        for (const edgeId of selectedEdgeIds) {
          useFunnelStore.getState().deleteConnection(edgeId);
        }

        useFunnelStore.getState().clearSelection();
      }
    },
    [edges],
  );

  const panOnDrag = altPressed ? false : true;
  const selectionOnDrag = altPressed ? true : false;

  return (
    <div className={styles.canvasWrap} onKeyDown={handleKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onSelectionEnd={handleSelectionEnd}
        zoomOnScroll
        zoomOnPinch
        panOnDrag={panOnDrag}
        selectionOnDrag={selectionOnDrag}
        selectionMode={'partial' as SelectionMode}
        selectNodesOnDrag={false}
        minZoom={0.1}
        maxZoom={3}
        snapToGrid={gridSnap}
        snapGrid={[16, 16]}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        connectionMode={ConnectionMode.Loose}
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
    </div>
  );
}

export function MapCanvas() {
  return <MapCanvasInner />;
}
