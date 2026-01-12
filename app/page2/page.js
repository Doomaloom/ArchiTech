"use client";

import { useCallback, useRef } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  Position,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

const MODULES = [
  { type: "Input", description: "Collects data" },
  { type: "Process", description: "Transforms data" },
  { type: "Logic", description: "Branches decisions" },
  { type: "Output", description: "Emits results" },
];

const initialNodes = [
  {
    id: "seed-1",
    type: "default",
    position: { x: 40, y: 40 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: "Start" },
  },
  {
    id: "seed-2",
    type: "default",
    position: { x: 280, y: 160 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: "Module" },
  },
];

const initialEdges = [
  {
    id: "seed-edge",
    source: "seed-1",
    target: "seed-2",
  },
];

function FlowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const nextId = useRef(1);

  const onConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");

      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const id = `module-${nextId.current++}`;

      setNodes((nds) =>
        nds.concat({
          id,
          type: "default",
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          position,
          data: { label: `${type} module` },
        })
      );
    },
    [screenToFlowPosition, setNodes]
  );

  const handleDragStart = useCallback((event, type) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  return (
    <div className="page2-flow">
      <aside className="page2-sidebar" aria-label="Module library">
        <div className="page2-sidebar-header">
          <p className="page2-sidebar-title">Module Library</p>
          <p className="page2-sidebar-subtitle">Drag a block into the canvas.</p>
        </div>
        <div className="page2-sidebar-list">
          {MODULES.map((module) => (
            <div
              key={module.type}
              className="page2-drag-item"
              draggable
              onDragStart={(event) => handleDragStart(event, module.type)}
            >
              <span className="page2-drag-title">{module.type}</span>
              <span className="page2-drag-subtitle">{module.description}</span>
            </div>
          ))}
        </div>
        <div className="page2-sidebar-footer">
          <p className="page2-helper">
            Tip: scroll to zoom, drag to pan, connect nodes with handles.
          </p>
        </div>
      </aside>
      <section className="page2-canvas" aria-label="Canvas workspace">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          fitView
          minZoom={0.35}
          maxZoom={2.4}
        >
          <Background
            variant="dots"
            gap={22}
            size={1.2}
            color="rgba(15, 23, 42, 0.18)"
          />
          <Controls position="bottom-right" />
        </ReactFlow>
      </section>
    </div>
  );
}

export default function Page2() {
  return (
    <div className="page2-shell">
      <div className="page2-panel">
        <ReactFlowProvider>
          <FlowBuilder />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
