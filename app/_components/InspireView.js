"use client";

import {
  forwardRef,
  useCallback,
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
import BuilderView from "./views/BuilderView";
import InspireRadialSelector from "./InspireRadialSelector";
import InspireStyleEditor from "./InspireStyleEditor";
import PreviewGenerationControls from "./PreviewGenerationControls";
import DropzonePanel from "./DropzonePanel";
import GalleryPanel from "./GalleryPanel";

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

const PREVIEW_MODE_OPTIONS = [
  { id: "image", label: "Image" },
  { id: "html", label: "HTML" },
];

const INSPIRE_STEPS = {
  DESCRIPTION: "project-description",
  STYLE: "style",
  TREE: "project-tree",
  WORKSPACE: "inspire-workspace",
  PREVIEWS: "previews",
  BUILDER: "builder",
  CODE: "code",
  SETTINGS: "settings",
};

const BRIEF_QUESTION_IDS = {
  CATEGORY: "site-category",
  AUDIENCE: "primary-audience",
  VALUE: "core-value",
  SECTION: "hero-section",
  CONVERSION: "primary-conversion",
};

const getSelectionLabel = (questions, selections, questionId) => {
  if (!Array.isArray(questions) || !selections || !questionId) {
    return "";
  }
  const question = questions.find((entry) => entry?.id === questionId);
  if (!question) {
    return "";
  }
  const selectedId = selections[questionId];
  if (!selectedId) {
    return "";
  }
  const selectedOption = question.options?.find(
    (entry) => entry?.id === selectedId
  );
  return selectedOption?.label?.toString().trim() || "";
};

const buildBriefFromSelections = (questions, selections) => {
  const category = getSelectionLabel(
    questions,
    selections,
    BRIEF_QUESTION_IDS.CATEGORY
  );
  const audience = getSelectionLabel(
    questions,
    selections,
    BRIEF_QUESTION_IDS.AUDIENCE
  );
  const value = getSelectionLabel(questions, selections, BRIEF_QUESTION_IDS.VALUE);
  const section = getSelectionLabel(
    questions,
    selections,
    BRIEF_QUESTION_IDS.SECTION
  );
  const conversion = getSelectionLabel(
    questions,
    selections,
    BRIEF_QUESTION_IDS.CONVERSION
  );

  const title = category ? `${category} website concept` : "";
  const name = [category, value].filter(Boolean).join(" - ");
  const details = [
    category ? `Category: ${category}.` : "",
    value ? `Primary visitor value: ${value}.` : "",
    section ? `Leading section: ${section}.` : "",
    conversion ? `Main conversion: ${conversion}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const goals = [value, conversion].filter(Boolean).join(" | ");

  return {
    title,
    name,
    details,
    audience,
    goals,
  };
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
  const cursorRef = useRef(null);
  const isDrawingRef = useRef(false);
  const boundsRef = useRef(null);
  const [cursorVisible, setCursorVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const resize = () => {
      const bounds = host.getBoundingClientRect();
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
    observer.observe(host);
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

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) {
      return;
    }
    cursor.style.width = `${brushSize}px`;
    cursor.style.height = `${brushSize}px`;
    cursor.style.marginLeft = `${Math.round(brushSize / -2)}px`;
    cursor.style.marginTop = `${Math.round(brushSize / -2)}px`;
  }, [brushSize]);

  const moveCursor = (point) => {
    const cursor = cursorRef.current;
    if (!cursor || !point) {
      return;
    }
    cursor.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(
      point.y
    )}px)`;
  };

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
    moveCursor(point);
    setCursorVisible(true);
    event.preventDefault();
    isDrawingRef.current = true;
    context.strokeStyle = "rgba(249, 115, 22, 0.55)";
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalCompositeOperation = "source-over";
    context.shadowBlur = 6;
    context.shadowColor = "rgba(249, 115, 22, 0.35)";
    context.beginPath();
    context.moveTo(point.x, point.y);
    updateBounds(point);
  };

  const handlePointerMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const point = getPointer(event, canvas);
    if (!point) {
      return;
    }
    moveCursor(point);
    if (!cursorVisible) {
      setCursorVisible(true);
    }
    if (!isDrawingRef.current) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    event.preventDefault();
    context.lineTo(point.x, point.y);
    context.stroke();
    updateBounds(point);
  };

  const handlePointerUp = (event) => {
    if (!isDrawingRef.current) {
      setCursorVisible(false);
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
    moveCursor(getPointer(event, canvas));
    isDrawingRef.current = false;
    setCursorVisible(true);
    if (typeof canvas.releasePointerCapture === "function") {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch (_error) {
        // no-op if the pointer is not captured
      }
    }
    emitMask();
  };

  const handlePointerLeave = (event) => {
    if (isDrawingRef.current) {
      handlePointerUp(event);
      return;
    }
    setCursorVisible(false);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="inspire-brush-canvas"
        onPointerDown={(event) => {
          const canvas = canvasRef.current;
          if (canvas && typeof canvas.setPointerCapture === "function") {
            canvas.setPointerCapture(event.pointerId);
          }
          handlePointerDown(event);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerUp}
      />
      <div
        ref={cursorRef}
        className={`inspire-brush-cursor${cursorVisible ? " is-visible" : ""}`}
        aria-hidden="true"
      />
    </>
  );
});

export default function InspireView() {
  const { inspireStep, setInspireStep } = useWorkflow();
  const {
    state: imageState,
    derived: imageDerived,
    actions: imageActions,
  } = useImageToSite();
  const {
    state: inspireState,
    derived: inspireDerived,
    actions: inspireActions,
  } = useInspire();
  const [brushSize, setBrushSize] = useState(18);
  const [clearTick, setClearTick] = useState(0);
  const brushRef = useRef(null);
  const syncedTreeRef = useRef(null);
  const isDescriptionStep = inspireStep === INSPIRE_STEPS.DESCRIPTION;
  const isStyleStep = inspireStep === INSPIRE_STEPS.STYLE;
  const isTreeStep = inspireStep === INSPIRE_STEPS.TREE;

  const handleDescriptionConfirm = useCallback(
    (_option, _currentQuestion, selections, resolvedQuestions) => {
      if (!selections || !resolvedQuestions?.length) {
        return;
      }
      const nextBrief = buildBriefFromSelections(resolvedQuestions, selections);
      inspireActions.updateBrief("title", nextBrief.title);
      inspireActions.updateBrief("name", nextBrief.name);
      inspireActions.updateBrief("details", nextBrief.details);
      inspireActions.updateBrief("audience", nextBrief.audience);
      inspireActions.updateBrief("goals", nextBrief.goals);
    },
    [inspireActions]
  );

  useEffect(() => {
    if (inspireStep === INSPIRE_STEPS.BUILDER && imageState.viewMode !== "builder") {
      imageActions.setViewMode("builder");
      return;
    }
    if (inspireStep === INSPIRE_STEPS.CODE && imageState.viewMode !== "code") {
      imageActions.setViewMode("code");
      return;
    }
    if (
      inspireStep !== INSPIRE_STEPS.BUILDER &&
      inspireStep !== INSPIRE_STEPS.CODE &&
      (imageState.viewMode === "iterate" ||
        imageState.viewMode === "builder" ||
        imageState.viewMode === "code")
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
      !inspireState.isGeneratingTree &&
      !inspireState.hasRequestedTree &&
      inspireState.selectedStyle
    ) {
      inspireActions.generateTree();
    }
  }, [
    inspireActions,
    inspireState.hasRequestedTree,
    inspireState.isGeneratingTree,
    inspireState.selectedStyle,
    inspireStep,
  ]);

  useEffect(() => {
    if (inspireStep === INSPIRE_STEPS.TREE) {
      return;
    }
    syncedTreeRef.current = null;
  }, [inspireStep]);

  useEffect(() => {
    if (inspireStep !== INSPIRE_STEPS.TREE || !inspireDerived.treeRoot) {
      return;
    }
    if (syncedTreeRef.current !== inspireDerived.treeRoot) {
      imageActions.setStructureFlow(inspireDerived.treeRoot);
      syncedTreeRef.current = inspireDerived.treeRoot;
    }
    if (imageState.viewMode !== "nodes") {
      imageActions.setViewMode("nodes");
    }
  }, [
    imageActions.setStructureFlow,
    imageActions.setViewMode,
    imageState.viewMode,
    inspireDerived.treeRoot,
    inspireStep,
  ]);

  useEffect(() => {
    if (
      (inspireStep !== INSPIRE_STEPS.TREE &&
        inspireStep !== INSPIRE_STEPS.PREVIEWS) ||
      !imageState.selectedNodeId ||
      imageState.selectedNodeId === inspireState.selectedNodeId
    ) {
      return;
    }
    inspireActions.setSelectedNodeId(imageState.selectedNodeId);
  }, [
    imageState.selectedNodeId,
    inspireActions.setSelectedNodeId,
    inspireState.selectedNodeId,
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
  const isImagePreviewMode = inspireState.previewMode !== "html";

  const layoutClassName = `imageflow-layout inspire-layout${
    isTreeStep ? "" : " is-no-gallery"
  }${
    inspireStep === INSPIRE_STEPS.BUILDER
      ? " is-builder"
      : inspireStep === INSPIRE_STEPS.CODE
      ? " is-code"
      : ""
  }${isDescriptionStep ? " is-preview-only" : ""}${
    isStyleStep ? " is-style-editor" : ""
  }`;

  const previewCards = useMemo(() => {
    const targetCount =
      inspireState.previewMode === "image" ? 6 : inspireState.previewCount;
    const items = inspireState.previewItems.slice(0, targetCount);
    return Array.from({ length: targetCount }, (_, index) => {
      const preview = items[index];
      if (preview) {
        return preview;
      }
      return {
        id: `preview-${index + 1}`,
        status: "empty",
        imageUrl: null,
        html: null,
        plan: null,
      };
    });
  }, [inspireState.previewCount, inspireState.previewItems, inspireState.previewMode]);

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
    const selectedPreview = inspireDerived.selectedPreview;
    if (!inspireState.previewItems.length) {
      setInspireStep(INSPIRE_STEPS.PREVIEWS);
      return;
    }
    if (!selectedPreview?.html) {
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
    setInspireStep(INSPIRE_STEPS.BUILDER);
  };

  const handleGenerateFromTree = useCallback(async () => {
    const activeNodeId =
      imageState.selectedNodeId || inspireState.selectedNodeId || null;
    if (activeNodeId && activeNodeId !== inspireState.selectedNodeId) {
      inspireActions.setSelectedNodeId(activeNodeId);
    }
    await inspireActions.generatePreviews({ nodeId: activeNodeId });
    setInspireStep(INSPIRE_STEPS.PREVIEWS);
  }, [
    imageState.selectedNodeId,
    inspireActions,
    inspireState.selectedNodeId,
    setInspireStep,
  ]);

  const renderMainPanel = () => {
    if (inspireStep === INSPIRE_STEPS.DESCRIPTION) {
      return <InspireRadialSelector onConfirm={handleDescriptionConfirm} />;
    }
    if (inspireStep === INSPIRE_STEPS.BUILDER) {
      return <BuilderView />;
    }
    if (inspireStep === INSPIRE_STEPS.CODE) {
      return <CodeEditorView />;
    }
    if (inspireStep === INSPIRE_STEPS.PREVIEWS) {
      return (
        <div
          className={`inspire-previews${
            inspireState.previewMode === "image" ? " is-image-mode" : ""
          }`}
        >
          {inspireState.previewError ? (
            <div className="inspire-preview-error" role="status">
              {inspireState.previewError}
            </div>
          ) : null}
          <div
            className="inspire-previews-grid"
            aria-busy={inspireState.isGeneratingPreviews}
          >
            {previewCards.map((preview, index) => {
              const optionIndex = String(index + 1).padStart(2, "0");
              const previewTitle = preview.plan?.title || `Option ${optionIndex}`;
              const previewState =
                preview.status === "loading"
                  ? "Generating"
                  : preview.renderError
                  ? "Issue"
                  : preview.imageUrl
                  ? "Image"
                  : preview.html
                  ? "HTML"
                  : "Pending";
              return (
                <button
                  key={preview.id}
                  type="button"
                  className={`inspire-preview-card${
                    inspireState.selectedPreviewIndex === index ? " is-selected" : ""
                  }${preview.status === "loading" ? " is-loading" : ""}`}
                  onClick={() => inspireActions.setSelectedPreviewIndex(index)}
                >
                  <div className="inspire-preview-thumb">
                    <span className="inspire-preview-index">{optionIndex}</span>
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
                    <span className="inspire-preview-title">{previewTitle}</span>
                    <span className="inspire-preview-tag">{previewState}</span>
                  </div>
                  {!preview.imageUrl &&
                  !preview.html &&
                  preview.status !== "loading" ? (
                    <span className="inspire-preview-placeholder">
                      {preview.renderError ||
                        inspireState.previewError ||
                        "Not generated yet"}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    if (inspireStep === INSPIRE_STEPS.TREE) {
      if (!inspireDerived.treeRoot) {
        return (
          <div className="inspire-tree-panel">
            <div className="inspire-tree-header">
              <div>
                <span className="inspire-tree-kicker">Project tree</span>
                <h2>Structure outline</h2>
                <p>Preparing the node workspace with offline structure.</p>
              </div>
            </div>
            <div className="inspire-tree-layout">
              <ul className="inspire-tree-list">
                <li>
                  <span>Node graph initializes instantly once structure is ready.</span>
                </li>
              </ul>
            </div>
          </div>
        );
      }
      return <DropzonePanel />;
    }
    if (inspireStep === INSPIRE_STEPS.WORKSPACE) {
      const workspacePreview = inspireDerived.selectedPreview;
      const hasPreview = Boolean(
        workspacePreview?.imageUrl || workspacePreview?.html
      );
      return (
        <div className="inspire-workspace">
          {inspireState.previewError ? (
            <div className="inspire-preview-error" role="status">
              {inspireState.previewError}
            </div>
          ) : null}
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
        <InspireStyleEditor
          styleError={inspireState.styleError}
          isGeneratingStyles={inspireState.isGeneratingStyles}
          styleIdeas={inspireState.styleIdeas}
          selectedStyle={selectedStyle}
          onSelectStyle={inspireActions.selectStyle}
        />
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
    return null;
  };

  const renderInfoPanel = () => {
    if (inspireStep === INSPIRE_STEPS.DESCRIPTION) {
      return null;
    }
    if (inspireStep === INSPIRE_STEPS.BUILDER) {
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
              onClick={() => setInspireStep(INSPIRE_STEPS.BUILDER)}
            >
              Back to iteration editor
            </button>
          </div>
        </aside>
      );
    }
    if (inspireStep === INSPIRE_STEPS.PREVIEWS) {
      const selectedPreview = inspireDerived.selectedPreview;
      const selectedPreviewNumber = inspireState.previewItems.length
        ? String(inspireState.selectedPreviewIndex + 1).padStart(2, "0")
        : null;
      const selectedLabel =
        selectedPreview?.plan?.title ||
        (inspireState.previewItems.length
          ? `Option ${selectedPreviewNumber}`
          : "No option selected");
      const readyPreviewCount = inspireState.previewItems.reduce(
        (total, preview) =>
          preview?.imageUrl || preview?.html ? total + 1 : total,
        0
      );
      const selectedState =
        selectedPreview?.status === "loading"
          ? "Generating"
          : selectedPreview?.renderError
          ? "Issue"
          : selectedPreview?.imageUrl || selectedPreview?.html
          ? "Ready"
          : "Pending";
      return (
        <aside className="imageflow-info inspire-info inspire-preview-info inspire-glass-info">
          <div className="imageflow-info-header">
            <p className="imageflow-info-kicker">Inspire</p>
            <h1 className="imageflow-info-title">Select a preview</h1>
            <p className="imageflow-info-subtitle">
              Pick the strongest direction and move it into workspace editing.
            </p>
          </div>
          <div className="inspire-preview-metrics" aria-label="Preview summary">
            <div className="inspire-preview-metric">
              <span>Ready</span>
              <strong>
                {readyPreviewCount}/{previewCards.length}
              </strong>
            </div>
            <div className="inspire-preview-metric">
              <span>Selected</span>
              <strong>{selectedPreviewNumber ? `#${selectedPreviewNumber}` : "--"}</strong>
            </div>
            <div className="inspire-preview-metric">
              <span>Mode</span>
              <strong>{isImagePreviewMode ? "Image" : "HTML"}</strong>
            </div>
          </div>
          <div className="inspire-info-summary inspire-preview-selection">
            <div className="inspire-preview-selection-head">
              <span>Active option</span>
              <span
                className={`inspire-preview-selection-state is-${selectedState.toLowerCase()}`}
              >
                {selectedState}
              </span>
            </div>
            <strong>{selectedLabel}</strong>
          </div>
          <div
            className="imageflow-panel-switch inspire-preview-mode-switch"
            role="tablist"
          >
            {PREVIEW_MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`imageflow-switch-button inspire-preview-mode-button${
                  inspireState.previewMode === option.id ? " is-active" : ""
                }`}
                onClick={() => inspireActions.setPreviewMode(option.id)}
                role="tab"
                aria-selected={inspireState.previewMode === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="imageflow-info-fields inspire-preview-actions">
            <button
              className="imageflow-generate-button inspire-preview-action is-primary"
              type="button"
              onClick={() =>
                inspireActions.generatePreviews({
                  nodeId:
                    imageState.selectedNodeId || inspireState.selectedNodeId || null,
                })
              }
              disabled={inspireState.isGeneratingPreviews}
            >
              {inspireState.isGeneratingPreviews
                ? "Generating..."
                : inspireState.previewItems.length
                ? "Regenerate"
                : "Generate"}
            </button>
            <button
              className="imageflow-generate-button inspire-preview-action is-ghost"
              type="button"
              onClick={handleContinueToWorkspace}
              disabled={
                inspireState.isGeneratingPreviews ||
                !inspireState.previewItems.length
              }
            >
              Open workspace
            </button>
          </div>
        </aside>
      );
    }
    if (inspireStep === INSPIRE_STEPS.TREE) {
      if (!inspireDerived.treeRoot) {
        return (
          <aside className="imageflow-info inspire-info inspire-tree-info inspire-glass-info">
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
                onClick={inspireActions.generateTree}
                disabled={inspireState.isGeneratingTree}
                aria-busy={inspireState.isGeneratingTree}
              >
                Regenerate tree
              </button>
              {inspireState.treeError ? (
                <p className="imageflow-error">{inspireState.treeError}</p>
              ) : null}
            </div>
          </aside>
        );
      }
      const selectedTreeNodeLabel =
        inspireDerived.selectedNode?.label ||
        imageDerived.selectedNodeLabel ||
        "Select a node";
      const activeNodeId =
        imageState.selectedNodeId || inspireState.selectedNodeId || null;
      return (
        <aside className="imageflow-info inspire-info inspire-tree-info inspire-glass-info">
          <div className="imageflow-info-header">
            <p className="imageflow-info-kicker">Structure</p>
            <h1 className="imageflow-info-title">Generate previews</h1>
            <p className="imageflow-info-subtitle">
              Pick HTML or image output from the selected node, then open results
              in the previews grid.
            </p>
          </div>
          <div className="inspire-info-summary">
            <span>Selected node</span>
            <strong>{selectedTreeNodeLabel}</strong>
          </div>
          <div className="imageflow-panel-switch" role="tablist">
            {PREVIEW_MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`imageflow-switch-button${
                  inspireState.previewMode === option.id ? " is-active" : ""
                }`}
                onClick={() => inspireActions.setPreviewMode(option.id)}
                role="tab"
                aria-selected={inspireState.previewMode === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
          <PreviewGenerationControls
            previewCount={inspireState.previewCount}
            quality={inspireState.modelQuality}
            creativityValue={inspireState.creativityValue}
            onPreviewCountChange={inspireActions.setPreviewCount}
            onQualityChange={inspireActions.setModelQuality}
            onCreativityChange={inspireActions.setCreativityValue}
            onGenerate={handleGenerateFromTree}
            isGenerating={inspireState.isGeneratingPreviews}
            isGenerateDisabled={!activeNodeId}
            generateLabel="Generate and open previews"
            errorMessage={inspireState.previewError || inspireState.treeError}
          />
          <div className="imageflow-info-fields">
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={inspireActions.generateTree}
              disabled={inspireState.isGeneratingTree}
              aria-busy={inspireState.isGeneratingTree}
            >
              Regenerate tree
            </button>
          </div>
        </aside>
      );
    }
    if (inspireStep === INSPIRE_STEPS.WORKSPACE) {
      const selectedPreview = inspireDerived.selectedPreview;
      const hasPreviewImage = Boolean(selectedPreview?.imageUrl);
      const hasMask = Boolean(inspireState.workspaceMask?.dataUrl);
      const hasFinalHtml = Boolean(selectedPreview?.html);
      const isApplyReady = isImagePreviewMode && hasPreviewImage && hasMask;
      const isConvertReady = isImagePreviewMode && hasPreviewImage;
      const isEditorReady = hasFinalHtml;
      return (
        <aside className="imageflow-info inspire-info inspire-workspace-info">
          <div className="imageflow-info-header">
            <p className="imageflow-info-kicker">Inspire workspace</p>
            <h1 className="imageflow-info-title">Mark changes</h1>
            <p className="imageflow-info-subtitle">
              Paint over areas you want to revise and leave a focused note.
            </p>
          </div>
          <div className="imageflow-info-fields inspire-workspace-fields">
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
              className="imageflow-generate-button inspire-workspace-action"
              type="button"
              onClick={inspireActions.applyMaskEdit}
              disabled={
                !isImagePreviewMode ||
                !hasPreviewImage ||
                !hasMask ||
                inspireState.isApplyingMaskEdit
              }
            >
              <span>
                {inspireState.isApplyingMaskEdit
                  ? "Applying mask edit..."
                  : "Apply changes to image"}
              </span>
              <span className="inspire-workspace-action-step">Step 1</span>
            </button>
            {!isImagePreviewMode ? (
              <div className="inspire-preview-error" role="status">
                Mask edit is available only for image previews.
              </div>
            ) : null}
            {isImagePreviewMode ? (
              <button
                className="imageflow-generate-button inspire-workspace-action"
                type="button"
                onClick={inspireActions.finalizeToHtml}
                disabled={!hasPreviewImage || inspireState.isFinalizingPreview}
              >
                <span>
                  {inspireState.isFinalizingPreview
                    ? "Finalizing..."
                    : "Convert to HTML"}
                </span>
                <span className="inspire-workspace-action-step">Step 2</span>
              </button>
            ) : null}
            <button
              className="imageflow-generate-button inspire-workspace-action"
              type="button"
              onClick={handleContinueToIteration}
              disabled={!hasFinalHtml || inspireState.isFinalizingPreview}
            >
              <span>Open in editor</span>
              <span className="inspire-workspace-action-step">Step 3</span>
            </button>
            <div className="inspire-workspace-flow" role="note">
              <span className="inspire-workspace-flow-title">Workflow</span>
              <div className="inspire-workspace-flow-track">
                <span
                  className={`inspire-workspace-flow-chip${
                    isApplyReady ? " is-ready" : ""
                  }`}
                >
                  1 Apply changes
                </span>
                <span
                  className={`inspire-workspace-flow-chip${
                    isConvertReady ? " is-ready" : ""
                  }`}
                >
                  2 Convert to HTML
                </span>
                <span
                  className={`inspire-workspace-flow-chip${
                    isEditorReady ? " is-ready" : ""
                  }`}
                >
                  3 Open in editor
                </span>
              </div>
            </div>
          </div>
        </aside>
      );
    }
    if (inspireStep === INSPIRE_STEPS.STYLE) {
      return null;
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
    return null;
  };

  const renderGalleryPanel = () => {
    if (inspireStep === INSPIRE_STEPS.TREE && inspireDerived.treeRoot) {
      return <GalleryPanel />;
    }
    return null;
  };

  const dropzoneClassName = `imageflow-dropzone inspire-dropzone${
    inspireStep === INSPIRE_STEPS.BUILDER
      ? " is-builder"
      : inspireStep === INSPIRE_STEPS.CODE
      ? " is-code"
      : ""
  }${inspireStep === INSPIRE_STEPS.TREE ? " is-tree" : ""}${
    inspireStep === INSPIRE_STEPS.PREVIEWS ? " is-preview" : ""
  }${
    isDescriptionStep ? " is-full" : ""
  }`;

  return (
    <div className="imageflow-shell inspire-shell">
      <div className="imageflow-panel">
        <ImageflowMenuBar />
        <ImageflowRulers />
        <div className={layoutClassName}>
          {isStyleStep ? (
            renderMainPanel()
          ) : isTreeStep && inspireDerived.treeRoot ? (
            <>
              {renderMainPanel()}
              {imageDerived.isPreviewMode ? null : renderGalleryPanel()}
              {imageDerived.isPreviewMode ? null : renderInfoPanel()}
            </>
          ) : (
            <>
              <section className={dropzoneClassName}>
                {renderMainPanel()}
              </section>
              {renderGalleryPanel()}
              {renderInfoPanel()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
