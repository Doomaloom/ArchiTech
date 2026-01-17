"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  ReactFlowProvider,
  applyNodeChanges,
  addEdge,
  Background,
  Controls,
  Position,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

const MODULE_LIBRARY = [
  { type: "Entry", description: "First user touchpoint" },
  { type: "Form", description: "Collects structured inputs" },
  { type: "Service", description: "Calls backend logic" },
  { type: "Decision", description: "Routes outcomes" },
  { type: "State", description: "Updates UI data" },
  { type: "Output", description: "Displays results" },
];

const INITIAL_PAGES = [
  {
    id: "page-1",
    name: "Landing Page",
    description: "Introduce the product, communicate value, and drive signups.",
    functions: [
      { id: "function-1", title: "Hero conversion flow" },
      { id: "function-2", title: "Social proof strip" },
    ],
  },
  {
    id: "page-2",
    name: "Dashboard",
    description: "Personal workspace for active projects and quick actions.",
    functions: [
      { id: "function-3", title: "Project overview" },
      { id: "function-4", title: "Create new workspace" },
    ],
  },
];

const createSeedNodes = (prefix) => [
  {
    id: `${prefix}-start`,
    type: "default",
    position: { x: 32, y: 36 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: "Trigger" },
  },
  {
    id: `${prefix}-step`,
    type: "default",
    position: { x: 240, y: 140 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: "Response" },
  },
];

const createSeedEdges = (prefix) => [
  {
    id: `${prefix}-edge`,
    source: `${prefix}-start`,
    target: `${prefix}-step`,
  },
];

const createPlaceholderNode = (prefix) => ({
  id: `${prefix}-placeholder`,
  type: "default",
  position: { x: 60, y: 60 },
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
  data: { label: "Drop a module" },
  selectable: false,
  draggable: false,
  deletable: false,
});

const STORAGE_KEY = "architech:page2:planner";

const extractIdNumber = (value, prefix) => {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(new RegExp(`^${prefix}-(\\d+)$`));
  return match ? Number(match[1]) : null;
};

const buildFlowIndex = (pages, existingFlows = {}) => {
  const next = {};

  (Array.isArray(pages) ? pages : []).forEach((page) => {
    (Array.isArray(page.functions) ? page.functions : []).forEach((fn) => {
      const stored = existingFlows?.[fn.id];
      if (stored?.nodes) {
        const placeholderId = `${fn.id}-placeholder`;
        const safeNodes = Array.isArray(stored.nodes) ? stored.nodes : [];
        const safeEdges = Array.isArray(stored.edges) ? stored.edges : [];
        const realNodes = safeNodes.filter((node) => node.id !== placeholderId);
        const hasRealNodes = realNodes.length > 0;
        const nodeIds = new Set(realNodes.map((node) => node.id));
        const filteredEdges = safeEdges.filter(
          (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
        );
        next[fn.id] = {
          nodes: hasRealNodes ? realNodes : [createPlaceholderNode(fn.id)],
          edges: hasRealNodes ? filteredEdges : [],
        };
        return;
      }

      next[fn.id] = {
        nodes: createSeedNodes(fn.id),
        edges: createSeedEdges(fn.id),
      };
    });
  });

  return next;
};

function FlowCanvas({ flowId, initialNodes, initialEdges, onFlowChange }) {
  const placeholderId = `${flowId}-placeholder`;
  const [nodes, setNodes] = useNodesState(() =>
    initialNodes ?? createSeedNodes(flowId)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(() =>
    initialEdges ?? createSeedEdges(flowId)
  );
  const { screenToFlowPosition } = useReactFlow();
  const nextId = useRef(1);
  const lastSavedRef = useRef(null);
  const isSyncingRef = useRef(false);
  const selectedNodeIds = useMemo(
    () =>
      nodes
        .filter((node) => node.selected && node.id !== placeholderId)
        .map((node) => node.id),
    [nodes]
  );
  const selectedEdgeIds = useMemo(
    () => edges.filter((edge) => edge.selected).map((edge) => edge.id),
    [edges]
  );
  const hasSelection =
    selectedNodeIds.length > 0 || selectedEdgeIds.length > 0;

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
      const id = `${flowId}-node-${nextId.current++}`;

      setNodes((nds) => {
        const nextNodes = nds.filter((node) => node.id !== placeholderId);
        return nextNodes.concat({
          id,
          type: "default",
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          position,
          data: { label: type },
        });
      });
    },
    [flowId, placeholderId, screenToFlowPosition, setNodes]
  );

  const onNodesChange = useCallback(
    (changes) => {
      const filteredChanges = changes.filter(
        (change) => !(change.type === "remove" && change.id === placeholderId)
      );

      setNodes((nds) => {
        const updated = applyNodeChanges(filteredChanges, nds);
        const realNodes = updated.filter((node) => node.id !== placeholderId);
        if (realNodes.length === 0) {
          setEdges([]);
          return [createPlaceholderNode(flowId)];
        }
        return realNodes;
      });
    },
    [flowId, placeholderId, setEdges, setNodes]
  );

  const handleDeleteSelection = useCallback(() => {
    if (!hasSelection) {
      return;
    }

    const selectedNodeSet = new Set(selectedNodeIds);
    const selectedEdgeSet = new Set(selectedEdgeIds);

    setNodes((nds) => {
      const remaining = nds.filter((node) => !selectedNodeSet.has(node.id));
      return remaining.length > 0
        ? remaining
        : [createPlaceholderNode(flowId)];
    });
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !selectedEdgeSet.has(edge.id) &&
          !selectedNodeSet.has(edge.source) &&
          !selectedNodeSet.has(edge.target)
      )
    );
  }, [hasSelection, selectedEdgeIds, selectedNodeIds, setEdges, setNodes]);

  const getFlowSignature = useCallback((nextNodes, nextEdges) => {
    return JSON.stringify({
      nodes: nextNodes,
      edges: nextEdges,
    });
  }, []);

  useEffect(() => {
    if (initialNodes && initialEdges) {
      const realNodes = initialNodes.filter(
        (node) => node.id !== placeholderId
      );
      const nextNodes =
        realNodes.length > 0 ? realNodes : [createPlaceholderNode(flowId)];
      const nodeIds = new Set(realNodes.map((node) => node.id));
      const nextEdges =
        realNodes.length > 0
          ? initialEdges.filter(
              (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
            )
          : [];
      const nextSignature = getFlowSignature(nextNodes, nextEdges);

      if (nextSignature === lastSavedRef.current) {
        return;
      }

      isSyncingRef.current = true;
      lastSavedRef.current = nextSignature;
      setNodes(nextNodes);
      setEdges(nextEdges);
    }
  }, [
    flowId,
    getFlowSignature,
    initialEdges,
    initialNodes,
    placeholderId,
    setEdges,
    setNodes,
  ]);

  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }

    const nextSignature = getFlowSignature(nodes, edges);
    if (nextSignature === lastSavedRef.current) {
      return;
    }

    lastSavedRef.current = nextSignature;
    onFlowChange?.(flowId, nodes, edges);
  }, [edges, flowId, getFlowSignature, nodes, onFlowChange]);

  return (
    <div className="page2-flow-surface" aria-label="Function flow canvas">
      <div className="page2-flow-toolbar">
        <button
          className="page2-flow-action"
          type="button"
          onClick={handleDeleteSelection}
          disabled={!hasSelection}
        >
          Delete selected
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        deleteKeyCode={["Backspace", "Delete"]}
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
    </div>
  );
}

export default function Page2() {
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [flows, setFlows] = useState(() => buildFlowIndex(INITIAL_PAGES));
  const [activePageId, setActivePageId] = useState(
    INITIAL_PAGES[0]?.id ?? null
  );
  const [fullscreenFunctionId, setFullscreenFunctionId] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const pageCounter = useRef(INITIAL_PAGES.length + 1);
  const functionCounter = useRef(
    INITIAL_PAGES.reduce((count, page) => count + page.functions.length, 0) + 1
  );

  const activePage = useMemo(
    () => pages.find((page) => page.id === activePageId) ?? null,
    [activePageId, pages]
  );

  const handleModuleDragStart = useCallback((event, type) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleAddPage = useCallback(() => {
    const pageNumber = pageCounter.current;
    pageCounter.current += 1;
    const functionNumber = functionCounter.current;
    functionCounter.current += 1;
    const functionId = `function-${functionNumber}`;

    const newPage = {
      id: `page-${pageNumber}`,
      name: `Page ${pageNumber}`,
      description: "Describe the intent for this page and its outcomes.",
      functions: [
        {
          id: functionId,
          title: "Primary user flow",
        },
      ],
    };

    setPages((prev) => [...prev, newPage]);
    setFlows((prev) => ({
      ...prev,
      [functionId]: {
        nodes: createSeedNodes(functionId),
        edges: createSeedEdges(functionId),
      },
    }));
    setActivePageId(newPage.id);
  }, []);

  const handleAddFunction = useCallback((pageId) => {
    const functionNumber = functionCounter.current;
    functionCounter.current += 1;
    const functionId = `function-${functionNumber}`;

    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId
          ? {
              ...page,
              functions: [
                ...page.functions,
                {
                  id: functionId,
                  title: `Function ${page.functions.length + 1}`,
                },
              ],
            }
          : page
      )
    );
    setFlows((prev) => ({
      ...prev,
      [functionId]: {
        nodes: createSeedNodes(functionId),
        edges: createSeedEdges(functionId),
      },
    }));
  }, []);

  const handlePageFieldChange = useCallback((pageId, field, value) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId ? { ...page, [field]: value } : page
      )
    );
  }, []);

  const handleFunctionTitleChange = useCallback(
    (pageId, functionId, value) => {
      setPages((prev) =>
        prev.map((page) =>
          page.id === pageId
            ? {
                ...page,
                functions: page.functions.map((fn) =>
                  fn.id === functionId ? { ...fn, title: value } : fn
                ),
              }
            : page
        )
      );
    },
    []
  );

  const handleDeleteFunction = useCallback((pageId, functionId) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId
          ? {
              ...page,
              functions: page.functions.filter((fn) => fn.id !== functionId),
            }
          : page
      )
    );
    setFlows((prev) => {
      const next = { ...prev };
      delete next[functionId];
      return next;
    });
    setFullscreenFunctionId((current) =>
      current === functionId ? null : current
    );
  }, []);

  const handleFlowChange = useCallback((flowId, nodes, edges) => {
    setFlows((prev) => ({
      ...prev,
      [flowId]: { nodes, edges },
    }));
  }, []);

  useEffect(() => {
    if (!fullscreenFunctionId) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setFullscreenFunctionId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenFunctionId]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setIsHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      const storedPages = Array.isArray(parsed?.pages)
        ? parsed.pages
        : INITIAL_PAGES;
      const storedFlows = buildFlowIndex(storedPages, parsed?.flows ?? {});
      const storedActiveId =
        typeof parsed?.activePageId === "string" ? parsed.activePageId : null;
      const hasActive = storedPages.some((page) => page.id === storedActiveId);
      const nextActiveId = hasActive
        ? storedActiveId
        : storedPages[0]?.id ?? null;

      const pageNumbers = storedPages
        .map((page) => extractIdNumber(page?.id, "page"))
        .filter((value) => Number.isFinite(value));
      const maxPage = pageNumbers.length ? Math.max(...pageNumbers) : 0;
      pageCounter.current = maxPage + 1;

      const functionNumbers = storedPages
        .flatMap((page) => (Array.isArray(page.functions) ? page.functions : []))
        .map((fn) => extractIdNumber(fn?.id, "function"))
        .filter((value) => Number.isFinite(value));
      const maxFunction = functionNumbers.length ? Math.max(...functionNumbers) : 0;
      functionCounter.current = maxFunction + 1;

      setPages(storedPages);
      setFlows(storedFlows);
      setActivePageId(nextActiveId);
    } catch (error) {
      setPages(INITIAL_PAGES);
      setFlows(buildFlowIndex(INITIAL_PAGES));
      setActivePageId(INITIAL_PAGES[0]?.id ?? null);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const payload = {
      pages,
      flows,
      activePageId,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [activePageId, flows, isHydrated, pages]);

  return (
    <div className="page2-shell">
      <div className="page2-panel">
        <header className="page2-header">
          <div className="page2-heading">
            <p className="page2-kicker">Architecture Planner</p>
            <h1 className="page2-title">Website Page Blueprint</h1>
            <p className="page2-subtitle">
              Plan each page, describe its purpose, and map the functional flows
              users will move through.
            </p>
          </div>
          <div className="page2-header-actions">
            <button
              className="page2-primary-button"
              type="button"
              onClick={handleAddPage}
            >
              Add Page
            </button>
          </div>
        </header>
        <div className="page2-body">
          <aside className="page2-pages" aria-label="Planned pages">
            <div className="page2-pages-header">
              <span className="page2-pages-title">Pages</span>
              <button
                className="page2-tertiary-button"
                type="button"
                onClick={handleAddPage}
              >
                New
              </button>
            </div>
            <div className="page2-pages-list">
              {pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  className={`page2-page-button${
                    page.id === activePageId ? " is-active" : ""
                  }`}
                  onClick={() => setActivePageId(page.id)}
                  style={{ "--delay": `${index * 70}ms` }}
                >
                  <span className="page2-page-name">{page.name}</span>
                  <span className="page2-page-meta">
                    {page.functions.length} functions
                  </span>
                </button>
              ))}
            </div>
            <div className="page2-pages-footer">
              <p className="page2-pages-helper">
                Select a page to outline its flow architecture.
              </p>
            </div>
          </aside>
          <section
            className={`page2-detail${
              fullscreenFunctionId ? " is-locked" : ""
            }`}
            aria-label="Page details"
          >
            {activePage ? (
              <>
                <div className="page2-detail-header">
                  <div>
                    <p className="page2-section-kicker">Page profile</p>
                    <p className="page2-section-title">{activePage.name}</p>
                  </div>
                  <span className="page2-count-chip">
                    {activePage.functions.length} flows
                  </span>
                </div>
                <div className="page2-detail-card">
                  <label className="page2-field">
                    <span className="page2-field-label">Page name</span>
                    <input
                      className="page2-input"
                      type="text"
                      value={activePage.name}
                      onChange={(event) =>
                        handlePageFieldChange(
                          activePage.id,
                          "name",
                          event.target.value
                        )
                      }
                    />
                  </label>
                  <label className="page2-field">
                    <span className="page2-field-label">Short description</span>
                    <textarea
                      className="page2-textarea"
                      rows={3}
                      value={activePage.description}
                      onChange={(event) =>
                        handlePageFieldChange(
                          activePage.id,
                          "description",
                          event.target.value
                        )
                      }
                    />
                  </label>
                </div>
                <div className="page2-library" aria-label="Module library">
                  <div className="page2-library-header">
                    <p className="page2-library-title">Module Library</p>
                    <p className="page2-library-subtitle">
                      Drag modules into a function flow.
                    </p>
                  </div>
                  <div className="page2-library-list">
                    {MODULE_LIBRARY.map((module) => (
                      <div
                        key={module.type}
                        className="page2-module-card"
                        draggable
                        onDragStart={(event) =>
                          handleModuleDragStart(event, module.type)
                        }
                      >
                        <span className="page2-module-title">
                          {module.type}
                        </span>
                        <span className="page2-module-subtitle">
                          {module.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="page2-functions">
                  <div className="page2-functions-header">
                    <div>
                      <p className="page2-section-kicker">Functions</p>
                      <p className="page2-section-subtitle">
                        One flowchart per page function.
                      </p>
                    </div>
                    <button
                      className="page2-secondary-button"
                      type="button"
                      onClick={() => handleAddFunction(activePage.id)}
                    >
                      Add Function
                    </button>
                  </div>
                  <div className="page2-functions-list">
                    {activePage.functions.map((fn, index) => (
                      <div
                        key={fn.id}
                        className={`page2-function-card${
                          fullscreenFunctionId === fn.id ? " is-fullscreen" : ""
                        }`}
                        style={{ "--delay": `${index * 90}ms` }}
                        role={
                          fullscreenFunctionId === fn.id ? "dialog" : undefined
                        }
                        aria-modal={
                          fullscreenFunctionId === fn.id ? "true" : undefined
                        }
                      >
                        <div className="page2-function-top">
                          <label className="page2-field page2-field-inline">
                            <span className="page2-field-label">Function</span>
                            <input
                              className="page2-input"
                              type="text"
                              value={fn.title}
                              onChange={(event) =>
                                handleFunctionTitleChange(
                                  activePage.id,
                                  fn.id,
                                  event.target.value
                                )
                              }
                            />
                          </label>
                          <div className="page2-function-actions">
                            <span className="page2-function-tag">
                              Flow {index + 1}
                            </span>
                            <button
                              className="page2-flow-button"
                              type="button"
                              onClick={() =>
                                setFullscreenFunctionId((current) =>
                                  current === fn.id ? null : fn.id
                                )
                              }
                            >
                              {fullscreenFunctionId === fn.id
                                ? "Exit full screen"
                                : "Full screen"}
                            </button>
                            <button
                              className="page2-flow-button page2-flow-button--danger"
                              type="button"
                              onClick={() =>
                                handleDeleteFunction(activePage.id, fn.id)
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="page2-function-helper">
                          Drag modules here to map what this function delivers.
                        </p>
                        {fullscreenFunctionId === fn.id ? (
                          <div
                            className="page2-flow-library"
                            aria-label="Quick module library"
                          >
                            {MODULE_LIBRARY.map((module) => (
                              <div
                                key={`${fn.id}-${module.type}`}
                                className="page2-module-card"
                                draggable
                                onDragStart={(event) =>
                                  handleModuleDragStart(event, module.type)
                                }
                              >
                                <span className="page2-module-title">
                                  {module.type}
                                </span>
                                <span className="page2-module-subtitle">
                                  {module.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <ReactFlowProvider>
                          <FlowCanvas
                            flowId={fn.id}
                            initialNodes={flows[fn.id]?.nodes}
                            initialEdges={flows[fn.id]?.edges}
                            onFlowChange={handleFlowChange}
                          />
                        </ReactFlowProvider>
                      </div>
                    ))}
                  </div>
                </div>
                {fullscreenFunctionId ? (
                  <button
                    className="page2-flow-backdrop"
                    type="button"
                    aria-label="Exit full screen"
                    onClick={() => setFullscreenFunctionId(null)}
                  />
                ) : null}
              </>
            ) : (
              <div className="page2-empty">
                <p className="page2-empty-title">
                  Start by adding a page to your architecture.
                </p>
                <p className="page2-empty-subtitle">
                  Each page will hold a short description and function flows.
                </p>
                <button
                  className="page2-primary-button"
                  type="button"
                  onClick={handleAddPage}
                >
                  Add Your First Page
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
