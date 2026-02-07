"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import ImageflowMenuBar from "./ImageflowMenuBar";
import ImageflowRulers from "./ImageflowRulers";
import { useInspire } from "./../_context/inspire-context";
import { useImageToSite } from "./../_context/image-to-site-context";
import { useWorkflow } from "./../_context/workflow-context";
import CodeEditorView from "./views/CodeEditorView";
import IterateView from "./views/IterateView";

const STYLE_PRESETS = [
  {
    id: "terrain",
    title: "Terrain Tech",
    palette: ["#1f2937", "#22c55e", "#f59e0b"],
    tags: ["Product", "Nature", "Serif"],
  },
  {
    id: "studio",
    title: "Studio Noir",
    palette: ["#0f172a", "#64748b", "#f8fafc"],
    tags: ["Premium", "Minimal", "Dark"],
  },
  {
    id: "citrus",
    title: "Citrus Grid",
    palette: ["#0f172a", "#f97316", "#facc15"],
    tags: ["Energetic", "Grid", "Bold"],
  },
  {
    id: "lumen",
    title: "Lumen Flow",
    palette: ["#0ea5e9", "#f8fafc", "#a855f7"],
    tags: ["Iridescent", "Studio", "Future"],
  },
];

const INSPIRE_STEPS = {
  DESCRIPTION: "project-description",
  STYLE: "style",
  TREE: "project-tree",
  WORKSPACE: "inspire-workspace",
  PREVIEWS: "previews",
  ITERATION: "iteration",
  CODE: "code",
  SETTINGS: "settings",
};

const getPointer = (event, element) => {
  if (!element) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

const InspireBrushCanvas = forwardRef(function InspireBrushCanvas(
  { brushSize, clearSignal, onMaskChange },
  ref
) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const boundsRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(bounds.width * scale));
      canvas.height = Math.max(1, Math.floor(bounds.height * scale));
      canvas.style.width = `${bounds.width}px`;
      canvas.style.height = `${bounds.height}px`;
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };
    resize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    boundsRef.current = null;
    onMaskChange?.(null);
  }, [clearSignal, onMaskChange]);

  const updateBounds = (point) => {
    if (!point) {
      return;
    }
    if (!boundsRef.current) {
      boundsRef.current = {
        minX: point.x,
        minY: point.y,
        maxX: point.x,
        maxY: point.y,
      };
      return;
    }
    boundsRef.current = {
      minX: Math.min(boundsRef.current.minX, point.x),
      minY: Math.min(boundsRef.current.minY, point.y),
      maxX: Math.max(boundsRef.current.maxX, point.x),
      maxY: Math.max(boundsRef.current.maxY, point.y),
    };
  };

  const emitMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const bounds = boundsRef.current;
    if (!bounds) {
      onMaskChange?.(null);
      return;
    }
    const width = Math.max(0, bounds.maxX - bounds.minX);
    const height = Math.max(0, bounds.maxY - bounds.minY);
    if (!width || !height) {
      onMaskChange?.(null);
      return;
    }
    onMaskChange?.({
      dataUrl: canvas.toDataURL("image/png"),
      bounds: {
        x: bounds.minX,
        y: bounds.minY,
        width,
        height,
      },
    });
  };

  const handlePointerDown = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const point = getPointer(event, canvas);
    if (!point) {
      return;
    }
    event.preventDefault();
    isDrawingRef.current = true;
    context.strokeStyle = "rgba(15, 118, 110, 0.7)";
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(point.x, point.y);
    updateBounds(point);
  };

  const handlePointerMove = (event) => {
    if (!isDrawingRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const point = getPointer(event, canvas);
    if (!point) {
      return;
    }
    event.preventDefault();
    context.lineTo(point.x, point.y);
    context.stroke();
    updateBounds(point);
  };

  const handlePointerUp = (event) => {
    if (!isDrawingRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    event.preventDefault();
    context.closePath();
    isDrawingRef.current = false;
    emitMask();
  };

  return (
    <div className="inspire-brush-stage" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="inspire-brush-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
});

export default function InspireView() {
  const { inspireStep, setInspireStep } = useWorkflow();
  const { state: imageState, actions: imageActions } = useImageToSite();
  const {
    state: inspireState,
    derived: inspireDerived,
    actions: inspireActions,
  } = useInspire();
  const [styleTab, setStyleTab] = useState("ai");
  const [brushSize, setBrushSize] = useState(18);
  const [clearTick, setClearTick] = useState(0);
  const brushRef = useRef(null);

  useEffect(() => {
    if (inspireStep === INSPIRE_STEPS.ITERATION && imageState.viewMode !== "iterate") {
      imageActions.setViewMode("iterate");
      return;
    }
    if (inspireStep === INSPIRE_STEPS.CODE && imageState.viewMode !== "code") {
      imageActions.setViewMode("code");
      return;
    }
    if (
      inspireStep !== INSPIRE_STEPS.ITERATION &&
      inspireStep !== INSPIRE_STEPS.CODE &&
      (imageState.viewMode === "iterate" || imageState.viewMode === "code")
    ) {
      imageActions.setViewMode("start");
    }
  }, [imageActions, imageState.viewMode, inspireStep]);

  useEffect(() => {
    if (
      inspireStep === INSPIRE_STEPS.STYLE &&
      !inspireState.styleIdeas.length &&
      !inspireState.isGeneratingStyles
    ) {
      inspireActions.loadStyleIdeas();
    }
  }, [
    inspireActions,
    inspireState.isGeneratingStyles,
    inspireState.styleIdeas.length,
    inspireStep,
  ]);

  useEffect(() => {
    if (
      inspireStep === INSPIRE_STEPS.TREE &&
      !inspireState.tree &&
      !inspireState.isGeneratingTree &&
      inspireState.selectedStyle
    ) {
      inspireActions.generateTree();
    }
  }, [
    inspireActions,
    inspireState.isGeneratingTree,
    inspireState.selectedStyle,
    inspireState.tree,
    inspireStep,
  ]);

  useEffect(() => {
    if (
      inspireStep === INSPIRE_STEPS.PREVIEWS &&
      !inspireState.previewItems.length &&
      !inspireState.isGeneratingPreviews &&
      inspireDerived.treeNodes.length
    ) {
      inspireActions.generatePreviews();
    }
  }, [
    inspireActions,
    inspireDerived.treeNodes.length,
    inspireState.isGeneratingPreviews,
    inspireState.previewItems.length,
    inspireStep,
  ]);

  useEffect(() => {
    if (!inspireState.selectedStyle) {
      const fallback = inspireState.styleIdeas[0] || STYLE_PRESETS[0];
      if (fallback) {
        inspireActions.selectStyle(fallback);
      }
    }
  }, [inspireActions, inspireState.selectedStyle, inspireState.styleIdeas]);

  const selectedStyle = useMemo(() => {
    return (
      inspireState.selectedStyle || inspireState.styleIdeas[0] || STYLE_PRESETS[0]
    );
  }, [inspireState.selectedStyle, inspireState.styleIdeas]);

  const layoutClassName = `imageflow-layout inspire-layout is-no-gallery${
    inspireStep === INSPIRE_STEPS.CODE ? " is-code" : ""
  }${
    inspireStep === INSPIRE_STEPS.ITERATION ? " is-preview-only" : ""
  }`;

  const treePages = useMemo(() => {
    return inspireDerived.treeNodes.filter((node) => node.depth === 1);
  }, [inspireDerived.treeNodes]);

  const previewCards = useMemo(() => {
    if (inspireState.previewItems.length) {
      return inspireState.previewItems;
    }
    return Array.from({ length: inspireState.previewCount }, (_, index) => ({
      id: `preview-${index + 1}`,
      status: "empty",
      imageUrl: null,
      html: null,
      plan: null,
    }));
  }, [inspireState.previewCount, inspireState.previewItems]);

  const handleContinueToStyle = () => {
    setInspireStep(INSPIRE_STEPS.STYLE);
    if (!inspireState.styleIdeas.length) {
      inspireActions.loadStyleIdeas();
    }
  };

  const handleContinueToTree = () => {
    setInspireStep(INSPIRE_STEPS.TREE);
    inspireActions.generateTree();
  };

  const handleContinueToPreviews = () => {
    setInspireStep(INSPIRE_STEPS.PREVIEWS);
    inspireActions.generatePreviews();
  };

  const handleContinueToWorkspace = () => {
    if (inspireState.isGeneratingPreviews) {
      return;
    }
    if (!inspireState.previewItems.length) {
      setInspireStep(INSPIRE_STEPS.PREVIEWS);
      return;
    }
    setInspireStep(INSPIRE_STEPS.WORKSPACE);
  };

  const handleContinueToIteration = () => {
    if (!inspireState.previewItems.length) {
      setInspireStep(INSPIRE_STEPS.PREVIEWS);
      return;
    }
    const inspireMeta = {
      style: selectedStyle,
      note: inspireState.workspaceNote,
      mask: inspireState.workspaceMask,
    };
    imageActions.hydratePreviews({
      previews: inspireState.previewItems.map((preview) => ({
        ...preview,
        inspireMeta,
      })),
      selectedIndex: inspireState.selectedPreviewIndex,
    });
    setInspireStep(INSPIRE_STEPS.ITERATION);
  };

  const renderMainPanel = () => {
    if (inspireStep === INSPIRE_STEPS.ITERATION) {
      return <IterateView />;
    }
    if (inspireStep === INSPIRE_STEPS.CODE) {
      return <CodeEditorView />;
    }
    if (inspireStep === INSPIRE_STEPS.PREVIEWS) {
      return (
        <div className="inspire-previews">
          {inspireState.previewError ? (
            <div className="inspire-preview-error" role="status">
              {inspireState.previewError}
            </div>
          ) : null}
          <div
            className="inspire-previews-grid"
            aria-busy={inspireState.isGeneratingPreviews}
          >
            {previewCards.map((preview, index) => (
              <button
                key={preview.id}
                type="button"
                className={`inspire-preview-card${
                  inspireState.selectedPreviewIndex === index ? " is-selected" : ""
                }${preview.status === "loading" ? " is-loading" : ""}`}
                onClick={() => inspireActions.setSelectedPreviewIndex(index)}
              >
                <div className="inspire-preview-thumb">
                  <span className="inspire-preview-index">0{index + 1}</span>
                  {preview.imageUrl ? (
                    <img
                      className="inspire-preview-media"
                      src={preview.imageUrl}
                      alt={`Preview ${index + 1}`}
                      loading="lazy"
                    />
                  ) : preview.html ? (
                    <iframe
                      className="inspire-preview-media"
                      title={`Preview ${index + 1} HTML`}
                      sandbox=""
                      loading="lazy"
                      srcDoc={preview.html}
                    />
                  ) : (
                    <div className="inspire-preview-shapes">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </div>
                <div className="inspire-preview-meta">
                  <span>{preview.plan?.title || `Preview ${index + 1}`}</span>
                  <span className="inspire-preview-tag">
                    {preview.plan?.title ? "Concept" : "Preview"}
                  </span>
                </div>
                {!preview.imageUrl && !preview.html && preview.status !== "loading" ? (
                  <span className="inspire-preview-placeholder">
                    {inspireState.previewError || "No preview yet"}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (inspireStep === INSPIRE_STEPS.TREE) {
      return (
        <div className="inspire-tree-panel">
          <div className="inspire-tree-header">
            <div>
              <span className="inspire-tree-kicker">Project tree</span>
              <h2>Structure outline</h2>
              <p>Drafted sections based on the selected style.</p>
            </div>
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={inspireActions.generateTree}
              disabled={inspireState.isGeneratingTree}
            >
              Regenerate tree
            </button>
          </div>
          {inspireState.treeError ? (
            <div className="inspire-tree-error" role="status">
              {inspireState.treeError}
            </div>
          ) : null}
          <div className="inspire-tree-layout">
            <ul className="inspire-tree-list">
              {treePages.length ? (
                treePages.map((node) => (
                  <li
                    key={node.id}
                    className={
                      inspireState.selectedNodeId === node.id ? "is-selected" : ""
                    }
                  >
                    <button
                      type="button"
                      className="inspire-tree-item"
                      onClick={() => inspireActions.setSelectedNodeId(node.id)}
                    >
                      <span>{node.label}</span>
                      <span className="inspire-tree-role">Page</span>
                    </button>
                  </li>
                ))
              ) : (
                <li>
                  <span>
                    {inspireState.isGeneratingTree
                      ? "Generating tree..."
                      : "Generate the tree to see pages."}
                  </span>
                </li>
              )}
            </ul>
            <div className="inspire-tree-summary">
              <div>
                <span>Style</span>
                <strong>{selectedStyle?.title || ""}</strong>
              </div>
              <div>
                <span>Pages</span>
                <strong>{treePages.length || "-"}</strong>
              </div>
              <div>
                <span>Focus</span>
                <strong>{inspireState.brief.goals || "Conversion"}</strong>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (inspireStep === INSPIRE_STEPS.WORKSPACE) {
      const workspacePreview = inspireDerived.selectedPreview;
      const hasPreview = Boolean(
        workspacePreview?.imageUrl || workspacePreview?.html
      );
      return (
        <div className="inspire-workspace">
          <div className="inspire-workspace-toolbar">
            <div className="inspire-workspace-tools">
              <label className="inspire-workspace-label">
                Brush size
                <input
                  type="range"
                  min="6"
                  max="40"
                  value={brushSize}
                  onChange={(event) => setBrushSize(Number(event.target.value))}
                />
              </label>
              <button
                className="inspire-workspace-clear"
                type="button"
                onClick={() => {
                  setClearTick((current) => current + 1);
                  inspireActions.setWorkspaceMask(null);
                }}
              >
                Clear mask
              </button>
            </div>
            <div className="inspire-workspace-status">Mask edits only</div>
          </div>
          <div className="inspire-workspace-stage">
            <div className="inspire-workspace-preview">
              <div className="inspire-workspace-header">
                Draft preview - {selectedStyle?.title || ""}
              </div>
              <div className="inspire-workspace-canvas">
                {hasPreview ? (
                  <div className="inspire-workspace-frame">
                    {workspacePreview?.imageUrl ? (
                      <img
                        className="inspire-workspace-media"
                        src={workspacePreview.imageUrl}
                        alt="Selected preview"
                      />
                    ) : (
                      <iframe
                        className="inspire-workspace-media"
                        title="Selected preview"
                        sandbox=""
                        srcDoc={workspacePreview?.html || ""}
                      />
                    )}
                  </div>
                ) : (
                  <div className="inspire-workspace-empty">
                    Generate previews to start editing.
                  </div>
                )}
              </div>
            </div>
            <InspireBrushCanvas
              ref={brushRef}
              brushSize={brushSize}
              clearSignal={clearTick}
              onMaskChange={inspireActions.setWorkspaceMask}
            />
          </div>
        </div>
      );
    }
    if (inspireStep === INSPIRE_STEPS.STYLE) {
      return (
        <div className="inspire-style">
          <div className="imageflow-panel-switch" role="tablist">
            <button
              type="button"
              className={`imageflow-switch-button${
                styleTab === "ai" ? " is-active" : ""
              }`}
              onClick={() => setStyleTab("ai")}
              role="tab"
              aria-selected={styleTab === "ai"}
            >
              AI Style Ideas
            </button>
            <button
              type="button"
              className={`imageflow-switch-button${
                styleTab === "presets" ? " is-active" : ""
              }`}
              onClick={() => setStyleTab("presets")}
              role="tab"
              aria-selected={styleTab === "presets"}
            >
              Inspiration
            </button>
          </div>
          {inspireState.styleError ? (
            <div className="inspire-style-error" role="status">
              {inspireState.styleError}
            </div>
          ) : null}
          {styleTab === "ai" ? (
            <div className="inspire-style-grid">
              {inspireState.isGeneratingStyles &&
              !inspireState.styleIdeas.length ? (
                <div className="inspire-style-loading">
                  Generating style ideas...
                </div>
              ) : null}
              {inspireState.styleIdeas.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`inspire-style-card${
                    selectedStyle?.id === style.id ? " is-selected" : ""
                  }`}
                  onClick={() => inspireActions.selectStyle(style)}
                >
                  <div className="inspire-style-card-header">
                    <h3>{style.title}</h3>
                    <span>{style.summary}</span>
                  </div>
                  <div className="inspire-style-palette">
                    {style.palette.map((color) => (
                      <span key={color} style={{ background: color }} />
                    ))}
                  </div>
                  <div className="inspire-style-tags">
                    {style.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="inspire-preset-grid">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`inspire-preset-card${
                    selectedStyle?.id === style.id ? " is-selected" : ""
                  }`}
                  onClick={() => inspireActions.selectStyle(style)}
                >
                  <div className="inspire-preset-cover">
                    {style.palette.map((color) => (
                      <span key={color} style={{ background: color }} />
                    ))}
                  </div>
                  <div className="inspire-preset-meta">
                    <h3>{style.title}</h3>
                    <span>{style.tags.join(" - ")}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (inspireStep === INSPIRE_STEPS.SETTINGS) {
      return (
        <div className="inspire-settings">
          <div className="inspire-settings-card">
            <h3>Workflow settings</h3>
            <p>Configure Inspire defaults, preview counts, and export rules.</p>
            <div className="inspire-settings-grid">
              <div>
                <span className="inspire-settings-label">Preview density</span>
                <div className="inspire-settings-value">Balanced</div>
              </div>
              <div>
                <span className="inspire-settings-label">Model</span>
                <div className="inspire-settings-value">Gemini Pro</div>
              </div>
              <div>
                <span className="inspire-settings-label">Image engine</span>
                <div className="inspire-settings-value">Ideogram v3</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="inspire-brief">
        <div className="inspire-brief-card">
          <span className="inspire-brief-kicker">Project canvas</span>
          <h2>{inspireState.brief.title || "Describe the product vision"}</h2>
          <p>
            {inspireState.brief.details ||
              "Capture the mood, the experience, and the core promise in a few lines."}
          </p>
          <div className="inspire-brief-pills">
            <span>{inspireState.brief.audience || "Target audience"}</span>
            <span>{inspireState.brief.goals || "Primary goal"}</span>
          </div>
        </div>
        <div className="inspire-brief-grid">
          <div>
            <span>Vision</span>
            <p>Bold, premium storytelling with gentle gradients.</p>
          </div>
          <div>
            <span>Experience</span>
            <p>Flow through story beats, previews, and precise CTAs.</p>
          </div>
          <div>
            <span>Signals</span>
            <p>Highlight trust, performance, and modern craft.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderInfoPanel = () => {
    if (inspireStep === INSPIRE_STEPS.ITERATION) {
      return null;
    }
    if (inspireStep === INSPIRE_STEPS.CODE) {
      return (
        <aside className="imageflow-info inspire-info">
          <div className="imageflow-info-header">
            <p className="imageflow-info-kicker">Inspire</p>
            <h1 className="imageflow-info-title">Code editor</h1>
            <p className="imageflow-info-subtitle">
              Tweak generated HTML and ship the final experience.
            </p>
          </div>
          <div className="imageflow-info-fields">
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={() => setInspireStep(INSPIRE_STEPS.ITERATION)}
            >
              Back to iteration
            </button>
          </div>
        </aside>
      );
    }
    if (inspireStep === INSPIRE_STEPS.PREVIEWS) {
      const selectedLabel =
        inspireDerived.selectedPreview?.plan?.title ||
        (inspireState.previewItems.length
          ? `Preview ${inspireState.selectedPreviewIndex + 1}`
          : "No preview selected");
      return (
        <aside className="imageflow-info inspire-info">
          <div className="imageflow-info-header">
            <p className="imageflow-info-kicker">Inspire</p>
            <h1 className="imageflow-info-title">Select a preview</h1>
            <p className="imageflow-info-subtitle">
              Choose the layout that best matches the direction.
            </p>
          </div>
          <div className="inspire-info-summary">
            <span>Selected</span>
            <strong>{selectedLabel}</strong>
          </div>
          <div className="imageflow-info-fields">
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={inspireActions.generatePreviews}
              disabled={inspireState.isGeneratingPreviews}
            >
              {inspireState.isGeneratingPreviews
                ? "Generating previews..."
                : inspireState.previewItems.length
                ? "Regenerate previews"
                : "Generate previews"}
            </button>
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={handleContinueToWorkspace}
              disabled={
                inspireState.isGeneratingPreviews ||
                !inspireState.previewItems.length
              }
            >
              Continue to workspace
            </button>
          </div>
        </aside>
      );
    }
    if (inspireStep === INSPIRE_STEPS.TREE) {
      return (
        <aside className="imageflow-info inspire-info">
          <div className="imageflow-info-header">
            <p className="imageflow-info-kicker">Structure</p>
            <h1 className="imageflow-info-title">Review the tree</h1>
            <p className="imageflow-info-subtitle">
              Validate the page outline before generating previews.
            </p>
          </div>
          <div className="imageflow-info-fields">
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={handleContinueToPreviews}
              disabled={inspireState.isGeneratingTree || !inspireDerived.treeNodes.length}
            >
              Continue to previews
            </button>
          </div>
        </aside>
      );
    }
    if (inspireStep === INSPIRE_STEPS.WORKSPACE) {
      return (
        <aside className="imageflow-info inspire-info">
          <div className="imageflow-info-header">
            <p className="imageflow-info-kicker">Inspire workspace</p>
            <h1 className="imageflow-info-title">Mark changes</h1>
            <p className="imageflow-info-subtitle">
              Paint over areas you want to revise and leave a focused note.
            </p>
          </div>
          <div className="imageflow-info-fields">
            <label className="imageflow-field">
              <span className="imageflow-field-label">Comment</span>
              <textarea
                className="imageflow-textarea"
                rows={6}
                placeholder="Describe what should change in the selected area."
                value={inspireState.workspaceNote}
                onChange={(event) =>
                  inspireActions.setWorkspaceNote(event.target.value)
                }
              />
            </label>
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={handleContinueToIteration}
            >
              Continue to iteration
            </button>
          </div>
        </aside>
      );
    }
    if (inspireStep === INSPIRE_STEPS.STYLE) {
      return (
        <aside className="imageflow-info inspire-info">
          <div className="imageflow-info-header">
            <p className="imageflow-info-kicker">Style direction</p>
            <h1 className="imageflow-info-title">Choose a look</h1>
            <p className="imageflow-info-subtitle">
              Select a style to guide palettes, shapes, and components.
            </p>
          </div>
          <div className="inspire-style-summary">
            <span>Selected style</span>
            <strong>{selectedStyle?.title || ""}</strong>
            <div className="inspire-style-swatch-row">
              {selectedStyle?.palette?.map((color) => (
                <span key={color} style={{ background: color }} />
              ))}
            </div>
          </div>
          <div className="imageflow-info-fields">
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={handleContinueToTree}
              disabled={inspireState.isGeneratingTree}
            >
              Continue to project tree
            </button>
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={inspireActions.loadStyleIdeas}
              disabled={inspireState.isGeneratingStyles}
            >
              {inspireState.isGeneratingStyles
                ? "Generating styles..."
                : "Regenerate styles"}
            </button>
          </div>
        </aside>
      );
    }
    if (inspireStep === INSPIRE_STEPS.SETTINGS) {
      return (
        <aside className="imageflow-info inspire-info">
          <div className="imageflow-info-header">
            <p className="imageflow-info-kicker">Inspire</p>
            <h1 className="imageflow-info-title">Settings</h1>
            <p className="imageflow-info-subtitle">
              Tune defaults for generation, previews, and exports.
            </p>
          </div>
          <div className="imageflow-info-fields">
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={() => setInspireStep(INSPIRE_STEPS.DESCRIPTION)}
            >
              Back to project
            </button>
          </div>
        </aside>
      );
    }
    return (
      <aside className="imageflow-info inspire-info">
        <div className="imageflow-info-header">
          <p className="imageflow-info-kicker">Inspire</p>
          <h1 className="imageflow-info-title">Project description</h1>
          <p className="imageflow-info-subtitle">
            Define the look, feel, and functionality to guide the entire flow.
          </p>
        </div>
        <div className="imageflow-info-fields">
          <label className="imageflow-field">
            <span className="imageflow-field-label">Project title</span>
            <input
              className="imageflow-input-field"
              type="text"
              placeholder="Launch campaign"
              value={inspireState.brief.title}
              onChange={(event) =>
                inspireActions.updateBrief("title", event.target.value)
              }
            />
          </label>
          <label className="imageflow-field">
            <span className="imageflow-field-label">Product name</span>
            <input
              className="imageflow-input-field"
              type="text"
              placeholder="Atlas Studio"
              value={inspireState.brief.name}
              onChange={(event) =>
                inspireActions.updateBrief("name", event.target.value)
              }
            />
          </label>
          <label className="imageflow-field">
            <span className="imageflow-field-label">Description</span>
            <textarea
              className="imageflow-textarea"
              rows={4}
              placeholder="Describe the experience, tone, and visual direction."
              value={inspireState.brief.details}
              onChange={(event) =>
                inspireActions.updateBrief("details", event.target.value)
              }
            />
          </label>
          <label className="imageflow-field">
            <span className="imageflow-field-label">Audience</span>
            <input
              className="imageflow-input-field"
              type="text"
              placeholder="Founders, product teams, creators"
              value={inspireState.brief.audience}
              onChange={(event) =>
                inspireActions.updateBrief("audience", event.target.value)
              }
            />
          </label>
          <label className="imageflow-field">
            <span className="imageflow-field-label">Goals</span>
            <input
              className="imageflow-input-field"
              type="text"
              placeholder="Highlight benefits and drive conversions"
              value={inspireState.brief.goals}
              onChange={(event) =>
                inspireActions.updateBrief("goals", event.target.value)
              }
            />
          </label>
        </div>
        <button
          className="imageflow-generate-button"
          type="button"
          onClick={handleContinueToStyle}
        >
          Continue to style
        </button>
      </aside>
    );
  };

  const renderGalleryPanel = () => null;

  const dropzoneClassName = `imageflow-dropzone inspire-dropzone${
    inspireStep === INSPIRE_STEPS.CODE ? " is-code" : ""
  }${inspireStep === INSPIRE_STEPS.PREVIEWS ? " is-preview" : ""}`;

  return (
    <div className="imageflow-shell inspire-shell">
      <div className="imageflow-panel">
        <ImageflowMenuBar />
        <ImageflowRulers />
        <div className={layoutClassName}>
          <section className={dropzoneClassName}>
            {renderMainPanel()}
          </section>
          {renderInfoPanel()}
          {renderGalleryPanel()}
        </div>
      </div>
    </div>
  );
}
