"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  MarkerType,
  Position,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

const OBJECT_LIBRARY = [
  {
    type: "Entity",
    description: "Core data object with identity.",
    fields: ["id: uuid", "created_at: datetime"],
  },
  {
    type: "Value Object",
    description: "Immutable object defined by its values.",
    fields: ["value: string"],
  },
  {
    type: "Lookup",
    description: "Reference table with stable values.",
    fields: ["id: int", "label: string"],
  },
  {
    type: "Junction",
    description: "Many-to-many relationship table.",
    fields: ["left_id: uuid", "right_id: uuid"],
  },
];

const RELATIONSHIP_PRESETS = [
  {
    id: "association",
    label: "Association",
    description: "General link between objects.",
    style: { stroke: "#1f2937" },
    markerEnd: null,
  },
  {
    id: "dependency",
    label: "Dependency",
    description: "One object depends on another.",
    style: { stroke: "#1f2937", strokeDasharray: "6 4" },
    markerEnd: { type: MarkerType.Arrow, color: "#1f2937" },
  },
  {
    id: "aggregation",
    label: "Aggregation",
    description: "Loose whole-part relationship.",
    style: { stroke: "#0f5b5f" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0f5b5f" },
  },
  {
    id: "composition",
    label: "Composition",
    description: "Strong ownership relationship.",
    style: { stroke: "#0f5b5f", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0f5b5f" },
  },
  {
    id: "inheritance",
    label: "Inheritance",
    description: "Specialization of a parent object.",
    style: { stroke: "#1f2937", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#1f2937" },
  },
];

const OBJECT_LOOKUP = OBJECT_LIBRARY.reduce((acc, item) => {
  acc[item.type] = item;
  return acc;
}, {});

const RELATIONSHIP_LOOKUP = RELATIONSHIP_PRESETS.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

const initialNodes = [
  {
    id: "uml-1",
    type: "uml",
    position: { x: 80, y: 80 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      name: "User",
      objectType: "Entity",
      fields: ["id: uuid", "email: string", "created_at: datetime"],
    },
  },
  {
    id: "uml-2",
    type: "uml",
    position: { x: 380, y: 220 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      name: "Project",
      objectType: "Entity",
      fields: ["id: uuid", "title: string", "status: string"],
    },
  },
  {
    id: "uml-3",
    type: "uml",
    position: { x: 720, y: 120 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      name: "Task",
      objectType: "Entity",
      fields: ["id: uuid", "title: string", "assignee_id: uuid"],
    },
  },
];

const initialEdges = [
  {
    id: "uml-edge-1",
    source: "uml-1",
    target: "uml-2",
    type: "smoothstep",
    label: "Association",
    style: RELATIONSHIP_LOOKUP.association.style,
  },
  {
    id: "uml-edge-2",
    source: "uml-2",
    target: "uml-3",
    type: "smoothstep",
    label: "Composition",
    style: RELATIONSHIP_LOOKUP.composition.style,
    markerEnd: RELATIONSHIP_LOOKUP.composition.markerEnd,
  },
];

function UmlNode({ data }) {
  const fields = Array.isArray(data.fields) ? data.fields : [];

  return (
    <div className="page3-node">
      <div className="page3-node-header">
        <span className="page3-node-type">{data.objectType}</span>
        <span className="page3-node-name">{data.name}</span>
      </div>
      <div className="page3-node-divider" />
      <ul className="page3-node-fields">
        {fields.length ? (
          fields.map((field, index) => (
            <li key={`${data.name}-${index}`} className="page3-node-field">
              {field}
            </li>
          ))
        ) : (
          <li className="page3-node-field page3-node-field-empty">
            No fields yet
          </li>
        )}
      </ul>
    </div>
  );
}

function UmlFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [relationshipType, setRelationshipType] = useState("association");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const { screenToFlowPosition } = useReactFlow();
  const nextId = useRef(4);

  const onConnect = useCallback(
    (connection) => {
      const relationship = RELATIONSHIP_LOOKUP[relationshipType];
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            label: relationship.label,
            labelBgPadding: [6, 4],
            labelBgBorderRadius: 6,
            labelBgStyle: { fill: "rgba(255, 255, 255, 0.85)" },
            labelStyle: { fill: "#1f2937", fontWeight: 600, fontSize: 11 },
            style: relationship.style,
            markerEnd: relationship.markerEnd ?? undefined,
          },
          eds
        )
      );
    },
    [relationshipType, setEdges]
  );

  const handleDragStart = useCallback((event, type) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      const config = OBJECT_LOOKUP[type];

      if (!config) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const id = `uml-${nextId.current++}`;

      setNodes((nds) =>
        nds.concat({
          id,
          type: "uml",
          position,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            name: `${config.type} ${nextId.current - 1}`,
            objectType: config.type,
            fields: config.fields,
          },
        })
      );
    },
    [screenToFlowPosition, setNodes]
  );

  const handleSelectionChange = useCallback((selection) => {
    const nextNodeId = selection?.nodes?.[0]?.id ?? null;
    setSelectedNodeId(nextNodeId);
  }, []);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const handleNodeUpdate = useCallback(
    (updates) => {
      if (!selectedNodeId) {
        return;
      }

      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNodeId
            ? { ...node, data: { ...node.data, ...updates } }
            : node
        )
      );
    },
    [selectedNodeId, setNodes]
  );

  const handleFieldChange = useCallback(
    (value) => {
      const fields = value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      handleNodeUpdate({ fields });
    },
    [handleNodeUpdate]
  );

  return (
    <div className="page3-layout">
      <aside className="page3-sidebar" aria-label="Object library">
        <div className="page3-sidebar-header">
          <p className="page3-kicker">Object Library</p>
          <p className="page3-subtitle">
            Drag data objects onto the UML canvas.
          </p>
        </div>
        <div className="page3-sidebar-section">
          {OBJECT_LIBRARY.map((item) => (
            <div
              key={item.type}
              className="page3-drag-card"
              draggable
              onDragStart={(event) => handleDragStart(event, item.type)}
            >
              <span className="page3-drag-title">{item.type}</span>
              <span className="page3-drag-description">
                {item.description}
              </span>
            </div>
          ))}
        </div>
        <div className="page3-sidebar-divider" />
        <div className="page3-sidebar-header">
          <p className="page3-kicker">Relationship Type</p>
          <p className="page3-subtitle">
            Choose how objects relate before connecting.
          </p>
        </div>
        <div className="page3-relationship-list">
          {RELATIONSHIP_PRESETS.map((relationship) => (
            <button
              key={relationship.id}
              type="button"
              className={`page3-relationship-pill${
                relationship.id === relationshipType ? " is-active" : ""
              }`}
              onClick={() => setRelationshipType(relationship.id)}
            >
              <span className="page3-relationship-name">
                {relationship.label}
              </span>
              <span className="page3-relationship-meta">
                {relationship.description}
              </span>
            </button>
          ))}
        </div>
      </aside>
      <section className="page3-canvas" aria-label="UML canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={{ uml: UmlNode }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={handleSelectionChange}
          fitView
          minZoom={0.35}
          maxZoom={2.4}
        >
          <Background
            variant="lines"
            gap={20}
            size={1}
            color="rgba(15, 23, 42, 0.08)"
          />
          <Controls position="bottom-right" />
        </ReactFlow>
      </section>
      <aside className="page3-inspector" aria-label="Object inspector">
        {selectedNode ? (
          <div className="page3-inspector-card">
            <div className="page3-inspector-header">
              <p className="page3-kicker">Object Inspector</p>
              <p className="page3-inspector-title">{selectedNode.data.name}</p>
            </div>
            <label className="page3-field">
              <span className="page3-field-label">Object name</span>
              <input
                className="page3-input"
                type="text"
                value={selectedNode.data.name}
                onChange={(event) =>
                  handleNodeUpdate({ name: event.target.value })
                }
              />
            </label>
            <label className="page3-field">
              <span className="page3-field-label">Object type</span>
              <select
                className="page3-select"
                value={selectedNode.data.objectType}
                onChange={(event) =>
                  handleNodeUpdate({ objectType: event.target.value })
                }
              >
                {OBJECT_LIBRARY.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.type}
                  </option>
                ))}
              </select>
            </label>
            <label className="page3-field">
              <span className="page3-field-label">Fields</span>
              <textarea
                className="page3-textarea"
                rows={8}
                value={(selectedNode.data.fields ?? []).join("\n")}
                onChange={(event) => handleFieldChange(event.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="page3-inspector-empty">
            <p className="page3-inspector-title">Select an object</p>
            <p className="page3-subtitle">
              Click a node to edit its name and fields.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function Page3() {
  return (
    <div className="page3-shell">
      <div className="page3-panel">
        <header className="page3-header">
          <div>
            <p className="page3-kicker">UML Builder</p>
            <h1 className="page3-title">Data Object Diagram</h1>
            <p className="page3-subtitle">
              Model your data objects and define how they relate.
            </p>
          </div>
          <div className="page3-header-note">
            <p className="page3-header-title">Quick tips</p>
            <p className="page3-header-text">
              Drag objects in, connect them, and choose relationship types.
            </p>
          </div>
        </header>
        <ReactFlowProvider>
          <UmlFlow />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
