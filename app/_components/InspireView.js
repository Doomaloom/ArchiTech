"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ImageflowMenuBar from "./ImageflowMenuBar";
import ImageflowRulers from "./ImageflowRulers";
import { useImageToSite } from "./../_context/image-to-site-context";
import { useWorkflow } from "./../_context/workflow-context";
import CodeEditorView from "./views/CodeEditorView";
import IterateView from "./views/IterateView";

const STYLE_SUGGESTIONS = [
  {
    id: "aurora",
    title: "Aurora Glass",
    summary: "Soft gradients, diffused panels, and rounded cards.",
    palette: ["#0f172a", "#38bdf8", "#f97316", "#f8fafc"],
    tags: ["Glassmorphism", "Gradient", "Rounded"],
    components: ["Hero band", "Card grid", "Floating CTA"],
  },
  {
    id: "mono",
    title: "Mono Studio",
    summary: "High contrast, sharp typography, and minimal shapes.",
    palette: ["#0b0f1a", "#475569", "#e2e8f0", "#f8fafc"],
    tags: ["Monochrome", "Editorial", "Sharp"],
    components: ["Split hero", "Data panels", "Inline nav"],
  },
  {
    id: "sunset",
    title: "Sunset Bloom",
    summary: "Warm tones, layered shapes, and airy spacing.",
    palette: ["#1e293b", "#f97316", "#fb7185", "#fde68a"],
    tags: ["Warm", "Layered", "Soft"],
    components: ["Stacked cards", "Ribbon stats", "Soft buttons"],
  },
];

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

const PREVIEW_ITEMS = [
  { id: "preview-1", label: "Hero + Grid" },
  { id: "preview-2", label: "Split Landing" },
  { id: "preview-3", label: "Narrative Flow" },
  { id: "preview-4", label: "Product Shelf" },
  { id: "preview-5", label: "Dashboard" },
  { id: "preview-6", label: "Story Blocks" },
];

const PROJECT_TREE = [
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
  { id: "pricing", label: "Pricing" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
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

function InspireBrushCanvas({ brushSize, clearSignal }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);

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
  }, [clearSignal]);

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
}

export default function InspireView() {
  const { inspireStep, setInspireStep } = useWorkflow();
  const { state, actions } = useImageToSite();
  const [styleTab, setStyleTab] = useState("ai");
  const [selectedStyleId, setSelectedStyleId] = useState(STYLE_SUGGESTIONS[0].id);
  const [previewSelection, setPreviewSelection] = useState(PREVIEW_ITEMS[0].id);
  const [brushSize, setBrushSize] = useState(18);
  const [clearTick, setClearTick] = useState(0);
  const [workspaceNote, setWorkspaceNote] = useState("");
  const [projectBrief, setProjectBrief] = useState({
    title: "",
    name: "",
    details: "",
    audience: "",
    goals: "",
  });

  useEffect(() => {
    if (inspireStep === INSPIRE_STEPS.ITERATION && state.viewMode !== "iterate") {
      actions.setViewMode("iterate");
      return;
    }
    if (inspireStep === INSPIRE_STEPS.CODE && state.viewMode !== "code") {
      actions.setViewMode("code");
      return;
    }
    if (
      inspireStep !== INSPIRE_STEPS.ITERATION &&
      inspireStep !== INSPIRE_STEPS.CODE &&
      (state.viewMode === "iterate" || state.viewMode === "code")
    ) {
      actions.setViewMode("start");
    }
  }, [actions, inspireStep, state.viewMode]);

  const selectedStyle = useMemo(() => {
    return (
      STYLE_SUGGESTIONS.find((style) => style.id === selectedStyleId) ||
      STYLE_PRESETS.find((style) => style.id === selectedStyleId) ||
      STYLE_SUGGESTIONS[0]
    );
  }, [selectedStyleId]);

  const layoutClassName = `imageflow-layout inspire-layout is-no-gallery${
    inspireStep === INSPIRE_STEPS.CODE ? " is-code" : ""
  }${
    inspireStep === INSPIRE_STEPS.ITERATION ? " is-preview-only" : ""
  }`;

  const renderMainPanel = () => {
    if (inspireStep === INSPIRE_STEPS.ITERATION) {
      return <IterateView />;
    }
    if (inspireStep === INSPIRE_STEPS.CODE) {
      return <CodeEditorView />;
    }
    if (inspireStep === INSPIRE_STEPS.PREVIEWS) {
      return (
        <div className="inspire-previews-grid">
          {PREVIEW_ITEMS.map((preview, index) => (
            <button
              key={preview.id}
              type="button"
              className={`inspire-preview-card${
                previewSelection === preview.id ? " is-selected" : ""
              }`}
              onClick={() => setPreviewSelection(preview.id)}
            >
              <div className="inspire-preview-thumb">
                <span className="inspire-preview-index">0{index + 1}</span>
                <div className="inspire-preview-shapes">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="inspire-preview-meta">
                <span>{preview.label}</span>
                <span className="inspire-preview-tag">Preview</span>
              </div>
            </button>
          ))}
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
            <button className="imageflow-generate-button" type="button">
              Regenerate tree
            </button>
          </div>
          <div className="inspire-tree-layout">
            <ul className="inspire-tree-list">
              {PROJECT_TREE.map((node) => (
                <li key={node.id}>
                  <span>{node.label}</span>
                  <span className="inspire-tree-role">Page</span>
                </li>
              ))}
            </ul>
            <div className="inspire-tree-summary">
              <div>
                <span>Style</span>
                <strong>{selectedStyle.title}</strong>
              </div>
              <div>
                <span>Pages</span>
                <strong>{PROJECT_TREE.length}</strong>
              </div>
              <div>
                <span>Focus</span>
                <strong>{projectBrief.goals || "Conversion"}</strong>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (inspireStep === INSPIRE_STEPS.WORKSPACE) {
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
                onClick={() => setClearTick((current) => current + 1)}
              >
                Clear mask
              </button>
            </div>
            <div className="inspire-workspace-status">Mask edits only</div>
          </div>
          <div className="inspire-workspace-stage">
            <div className="inspire-workspace-preview">
              <div className="inspire-workspace-header">
                Draft preview - {selectedStyle.title}
              </div>
              <div className="inspire-workspace-canvas">
                <div className="inspire-workspace-block">
                  <div className="inspire-workspace-title">Launch section</div>
                  <div className="inspire-workspace-body">
                    Modular layout with floating cards and soft highlights.
                  </div>
                </div>
                <div className="inspire-workspace-columns">
                  <span />
                  <span />
                </div>
              </div>
            </div>
            <InspireBrushCanvas brushSize={brushSize} clearSignal={clearTick} />
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
          {styleTab === "ai" ? (
            <div className="inspire-style-grid">
              {STYLE_SUGGESTIONS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`inspire-style-card${
                    selectedStyleId === style.id ? " is-selected" : ""
                  }`}
                  onClick={() => setSelectedStyleId(style.id)}
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
                    selectedStyleId === style.id ? " is-selected" : ""
                  }`}
                  onClick={() => setSelectedStyleId(style.id)}
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
          <h2>{projectBrief.title || "Describe the product vision"}</h2>
          <p>
            {projectBrief.details ||
              "Capture the mood, the experience, and the core promise in a few lines."}
          </p>
          <div className="inspire-brief-pills">
            <span>{projectBrief.audience || "Target audience"}</span>
            <span>{projectBrief.goals || "Primary goal"}</span>
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
            <strong>
              {PREVIEW_ITEMS.find((item) => item.id === previewSelection)?.label}
            </strong>
          </div>
          <div className="imageflow-info-fields">
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={() => setInspireStep(INSPIRE_STEPS.ITERATION)}
            >
              Continue to iteration
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
              onClick={() => setInspireStep(INSPIRE_STEPS.WORKSPACE)}
            >
              Continue to workspace
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
                value={workspaceNote}
                onChange={(event) => setWorkspaceNote(event.target.value)}
              />
            </label>
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={() => setInspireStep(INSPIRE_STEPS.PREVIEWS)}
            >
              Generate previews
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
            <strong>{selectedStyle.title}</strong>
            <div className="inspire-style-swatch-row">
              {selectedStyle.palette?.map((color) => (
                <span key={color} style={{ background: color }} />
              ))}
            </div>
          </div>
          <div className="imageflow-info-fields">
            <button
              className="imageflow-generate-button"
              type="button"
              onClick={() => setInspireStep(INSPIRE_STEPS.TREE)}
            >
              Continue to project tree
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
              value={projectBrief.title}
              onChange={(event) =>
                setProjectBrief((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </label>
          <label className="imageflow-field">
            <span className="imageflow-field-label">Product name</span>
            <input
              className="imageflow-input-field"
              type="text"
              placeholder="Atlas Studio"
              value={projectBrief.name}
              onChange={(event) =>
                setProjectBrief((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label className="imageflow-field">
            <span className="imageflow-field-label">Description</span>
            <textarea
              className="imageflow-textarea"
              rows={4}
              placeholder="Describe the experience, tone, and visual direction."
              value={projectBrief.details}
              onChange={(event) =>
                setProjectBrief((current) => ({
                  ...current,
                  details: event.target.value,
                }))
              }
            />
          </label>
          <label className="imageflow-field">
            <span className="imageflow-field-label">Audience</span>
            <input
              className="imageflow-input-field"
              type="text"
              placeholder="Founders, product teams, creators"
              value={projectBrief.audience}
              onChange={(event) =>
                setProjectBrief((current) => ({
                  ...current,
                  audience: event.target.value,
                }))
              }
            />
          </label>
          <label className="imageflow-field">
            <span className="imageflow-field-label">Goals</span>
            <input
              className="imageflow-input-field"
              type="text"
              placeholder="Highlight benefits and drive conversions"
              value={projectBrief.goals}
              onChange={(event) =>
                setProjectBrief((current) => ({
                  ...current,
                  goals: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <button
          className="imageflow-generate-button"
          type="button"
          onClick={() => setInspireStep(INSPIRE_STEPS.STYLE)}
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
