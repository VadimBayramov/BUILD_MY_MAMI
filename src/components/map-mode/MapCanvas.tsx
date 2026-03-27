import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type NodeChange,
  type Connection as RFConnection,
  addEdge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nanoid } from 'nanoid';
import { useFunnelStore } from '@store/funnel-store';
import { ScreenNode } from './ScreenNode';
import type { Screen, Connection } from '@typedefs/funnel';
import styles from './MapCanvas.module.css';

const nodeTypes = { screen: ScreenNode };

function screensToNodes(screens: Record<string, Screen>): Node[] {
  return Object.values(screens).map((screen) => ({
    id: screen.id,
    type: 'screen',
    position: screen.position,
    data: {
      label: screen.name,
      screenType: screen.type,
      order: screen.order,
    },
  }));
}

function connectionsToEdges(connections: Connection[]): Edge[] {
  return connections.map((conn) => ({
    id: conn.id,
    source: conn.from,
    target: conn.to,
    label: conn.label || undefined,
    animated: !!conn.condition,
    style: { stroke: conn.condition ? '#f59e0b' : '#3b82f6', strokeWidth: 2 },
  }));
}

export function MapCanvas() {
  const screens = useFunnelStore((s) => s.project.funnel.screens);
  const connections = useFunnelStore((s) => s.project.funnel.connections);
  const gridSnap = useFunnelStore((s) => s.ui.gridSnap);
  const showMinimap = useFunnelStore((s) => s.ui.showMinimap);
  const selectScreen = useFunnelStore((s) => s.selectScreen);
  const clearSelection = useFunnelStore((s) => s.clearSelection);
  const moveScreen = useFunnelStore((s) => s.moveScreen);
  const deleteScreen = useFunnelStore((s) => s.deleteScreen);
  const addConnection = useFunnelStore((s) => s.addConnection);

  const initialNodes = useMemo(() => screensToNodes(screens), [screens]);
  const initialEdges = useMemo(() => connectionsToEdges(connections), [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      for (const change of changes) {
        if (change.type === 'position' && change.position && !change.dragging) {
          moveScreen(change.id, change.position);
        }
      }
    },
    [onNodesChange, moveScreen],
  );

  const handleConnect: OnConnect = useCallback(
    (connection: RFConnection) => {
      if (!connection.source || !connection.target) return;
      const newEdge = {
        id: `conn-${nanoid(8)}`,
        source: connection.source,
        target: connection.target,
      };
      setEdges((eds) => addEdge(newEdge, eds));
      addConnection({
        id: newEdge.id,
        from: connection.source,
        to: connection.target,
        trigger: 'option-click',
        condition: null,
        label: '',
        priority: 0,
        isDefault: true,
      });
    },
    [setEdges, addConnection],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectScreen(node.id, _event.ctrlKey || _event.metaKey);
    },
    [selectScreen],
  );

  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedIds = useFunnelStore.getState().ui.selectedScreenIds;
        for (const id of selectedIds) {
          deleteScreen(id);
          setNodes((nds) => nds.filter((n) => n.id !== id));
          setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        }
        clearSelection();
      }
    },
    [deleteScreen, clearSelection, setNodes, setEdges],
  );

  return (
    <div className={styles.canvasWrap} onKeyDown={handleKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        panOnScroll
        zoomOnPinch
        selectionOnDrag
        selectNodesOnDrag={false}
        minZoom={0.1}
        maxZoom={3}
        snapToGrid={gridSnap}
        snapGrid={[20, 20]}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        {showMinimap && (
          <MiniMap
            style={{ background: '#1a1d24' }}
            maskColor="rgba(0,0,0,0.6)"
            nodeColor="#3b82f6"
          />
        )}
        <Controls
          showInteractive={false}
          style={{ background: '#1a1d24', border: '1px solid #2d3139', borderRadius: 8 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2d3139" />
        <Panel position="top-left">
          <div className={styles.zoomInfo}>
            Screens: {Object.keys(screens).length}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
