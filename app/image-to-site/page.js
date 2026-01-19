"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const DEMO_PAGES = [
  { id: "page-home", label: "Home", position: { x: 260, y: 20 } },
  { id: "page-search", label: "Search", position: { x: 40, y: 140 } },
  { id: "page-watch", label: "Watch", position: { x: 260, y: 140 } },
  { id: "page-login", label: "Login", position: { x: 480, y: 140 } },
  { id: "page-subscriptions", label: "Subscriptions", position: { x: 40, y: 260 } },
  { id: "page-library", label: "Library", position: { x: 260, y: 260 } },
  { id: "page-channel", label: "Channel", position: { x: 480, y: 260 } },
  { id: "page-playlists", label: "Playlists", position: { x: 40, y: 380 } },
  { id: "page-history", label: "History", position: { x: 260, y: 380 } },
  { id: "page-settings", label: "Settings", position: { x: 480, y: 380 } },
];

const DEMO_EDGES = [
  { id: "edge-home-search", source: "page-home", target: "page-search" },
  { id: "edge-home-watch", source: "page-home", target: "page-watch" },
  { id: "edge-home-login", source: "page-home", target: "page-login" },
  { id: "edge-search-subscriptions", source: "page-search", target: "page-subscriptions" },
  { id: "edge-watch-library", source: "page-watch", target: "page-library" },
  { id: "edge-login-channel", source: "page-login", target: "page-channel" },
  { id: "edge-subscriptions-playlists", source: "page-subscriptions", target: "page-playlists" },
  { id: "edge-library-history", source: "page-library", target: "page-history" },
  { id: "edge-channel-settings", source: "page-channel", target: "page-settings" },
];

export default function ImageToSitePage() {
  const [fileMeta, setFileMeta] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState("start");
  const [previewCount, setPreviewCount] = useState(3);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [speedValue, setSpeedValue] = useState(60);
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const objectUrlsRef = useRef([]);
  const [selectedNodeId, setSelectedNodeId] = useState(
    DEMO_PAGES[0]?.id ?? null
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(() =>
    DEMO_PAGES.map((page) => ({
      id: page.id,
      position: page.position,
      data: { label: page.label },
      type: "default",
    }))
  );
  const [edges, , onEdgesChange] = useEdgesState(DEMO_EDGES);

  const hasFile = Boolean(fileMeta);
  const dropTitle = hasFile
    ? "Image ready for conversion"
    : "Drop an image or click to browse";
  const dropMeta = hasFile
    ? "Drag a new file to replace the current one."
    : "PNG, JPG, WebP up to 12MB";
  const fileSizeLabel = useMemo(() => {
    if (!fileMeta) {
      return "";
    }
    return formatFileSize(fileMeta.size);
  }, [fileMeta]);

  const activePreview = gallery[activeIndex] ?? fileMeta?.previewUrl ?? null;

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const selectedId = DEMO_PAGES[activeIndex % DEMO_PAGES.length]?.id ?? null;
    if (selectedId) {
      setSelectedNodeId(selectedId);
    }
    setNodes((current) =>
      current.map((node) => ({ ...node, selected: node.id === selectedId }))
    );
  }, [activeIndex, setNodes]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

  const selectedNodeLabel =
    DEMO_PAGES.find((page) => page.id === selectedNodeId)?.label ?? "—";
  const qualityValue = 100 - speedValue;

  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll("[data-imageflow-step]")
    );

    const handleClick = (event) => {
      const target = event.currentTarget;
      const step = target?.dataset?.imageflowStep;
      if (step) {
        setViewMode(step);
      }
    };

    buttons.forEach((button) => {
      button.addEventListener("click", handleClick);
    });

    return () => {
      buttons.forEach((button) => {
        button.removeEventListener("click", handleClick);
      });
    };
  }, []);

  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll("[data-imageflow-step]")
    );

    buttons.forEach((button) => {
      const step = button?.dataset?.imageflowStep;
      if (!step) {
        return;
      }
      const isActive =
        step === viewMode ||
        (step === "preview" && viewMode === "selected");
      button.classList.toggle("is-active", isActive);
    });
  }, [viewMode]);

  const handleFile = (file) => {
    if (!file) {
      setFileMeta(null);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(previewUrl);
    setFileMeta({
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl,
    });
    setGallery((prev) => [previewUrl, ...prev].slice(0, 6));
    setActiveIndex(0);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setTitle(baseName);
    setName(file.name);
    setDetails(file.type ? `File type: ${file.type}` : "File type: image");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div className="imageflow-shell">
      <div className="imageflow-panel">
        <div className="imageflow-layout">
          <section
            className={`imageflow-dropzone${hasFile ? " is-ready" : ""}${
              isDragging ? " is-dragging" : ""
            }${viewMode === "nodes" ? " is-tree" : ""}${
              viewMode === "preview" ? " is-preview" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="imageflow-media-controls" aria-label="Image tools">
              <button
                className="imageflow-control-button"
                type="button"
                aria-label="Previous image"
                onClick={() =>
                  setActiveIndex((current) =>
                    current > 0 ? current - 1 : Math.max(gallery.length - 1, 0)
                  )
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M14 6l-6 6 6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className="imageflow-control-button"
                type="button"
                aria-label="Zoom image"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    cx="11"
                    cy="11"
                    r="6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M11 8v6M8 11h6M16.5 16.5L20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                className="imageflow-control-button"
                type="button"
                aria-label="Delete image"
                onClick={() => {
                  if (!gallery.length) {
                    return;
                  }
                  setGallery((prev) => {
                    const next = prev.filter((_, index) => index !== activeIndex);
                    setActiveIndex((current) =>
                      current > 0 ? current - 1 : 0
                    );
                    return next;
                  });
                  setFileMeta(null);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6 7h12M9 7V5h6v2M9 10v7M12 10v7M15 10v7M7 7l1 13h8l1-13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className="imageflow-control-button"
                type="button"
                aria-label="Next image"
                onClick={() =>
                  setActiveIndex((current) =>
                    gallery.length
                      ? (current + 1) % gallery.length
                      : current
                  )
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M10 6l6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            {viewMode === "nodes" ? (
              <div className="imageflow-tree" aria-label="Site tree">
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={(_, node) => {
                      setSelectedNodeId(node.id);
                      const index = DEMO_PAGES.findIndex(
                        (page) => page.id === node.id
                      );
                      if (index >= 0 && index < gallery.length) {
                        setActiveIndex(index);
                      }
                    }}
                    fitView
                    minZoom={0.3}
                    maxZoom={2.2}
                  >
                    <Background gap={20} size={1} color="rgba(15, 23, 42, 0.12)" />
                    <Controls position="bottom-right" />
                  </ReactFlow>
                </ReactFlowProvider>
              </div>
            ) : viewMode === "preview" ? (
              <div
                className={`imageflow-previews imageflow-previews--${previewCount}`}
                aria-label="Generated previews"
              >
                {Array.from({ length: previewCount }).map((_, index) => (
                  <button
                    key={`preview-${index}`}
                    className={`imageflow-preview-card${
                      selectedPreviewIndex === index ? " is-selected" : ""
                    }`}
                    type="button"
                    onClick={() => {
                      setSelectedPreviewIndex(index);
                      setViewMode("selected");
                    }}
                  >
                    <span className="imageflow-preview-label">
                      Preview {index + 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : viewMode === "selected" ? (
              <div className="imageflow-previews imageflow-previews--1">
                <div className="imageflow-preview-card is-selected">
                  <span className="imageflow-preview-label">
                    Preview {selectedPreviewIndex + 1}
                  </span>
                </div>
              </div>
            ) : viewMode === "code" ? (
              <div className="imageflow-code-placeholder">
                <p>Code view coming next.</p>
              </div>
            ) : (
              <>
                <input
                  id="imageflow-upload"
                  className="imageflow-file-input"
                  type="file"
                  accept="image/*"
                  aria-label="Upload image"
                  onChange={handleFileChange}
                />
                <label
                  className="imageflow-drop-content"
                  htmlFor="imageflow-upload"
                >
                  {activePreview ? (
                    <img
                      className="imageflow-preview"
                      src={activePreview}
                      alt="Uploaded preview"
                    />
                  ) : (
                    <>
                      <span className="imageflow-drop-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M7 15l3-3 2 2 4-4 3 3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                          />
                          <rect
                            x="4"
                            y="5"
                            width="16"
                            height="14"
                            rx="3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                          <circle cx="9" cy="9" r="1.6" fill="currentColor" />
                        </svg>
                      </span>
                      <span className="imageflow-drop-title">{dropTitle}</span>
                      <span className="imageflow-drop-meta">{dropMeta}</span>
                    </>
                  )}
                </label>
                <div className="imageflow-file-row">
                  {hasFile ? (
                    <div className="imageflow-file-chip">
                      <span className="imageflow-file-name">
                        {fileMeta.name}
                      </span>
                      <span className="imageflow-file-size">{fileSizeLabel}</span>
                    </div>
                  ) : (
                    <span className="imageflow-file-empty">
                      Add an image to start the conversion.
                    </span>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="imageflow-gallery" aria-label="Uploaded gallery">
            <div className="imageflow-gallery-header">
              <span className="imageflow-gallery-title">Gallery</span>
              <span className="imageflow-gallery-meta">
                {hasFile ? "Latest upload highlighted" : "Awaiting uploads"}
              </span>
            </div>
            <div className="imageflow-thumbs">
              {gallery.length ? (
                gallery.map((src, index) => (
                  <button
                    key={`thumb-${src}`}
                    className={`imageflow-thumb${
                      index === activeIndex ? " is-active" : ""
                    }`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                  >
                    <img src={src} alt="" />
                  </button>
                ))
              ) : (
                <div className="imageflow-thumb is-empty" aria-hidden="true" />
              )}
            </div>
          </section>

          <aside className="imageflow-info">
            <div className="imageflow-info-header">
              {viewMode === "nodes" ? (
                <>
                  <p className="imageflow-info-kicker">Selected node</p>
                  <h1 className="imageflow-info-title">{selectedNodeLabel}</h1>
                  <p className="imageflow-info-subtitle">
                    Pick how many previews to generate for this node.
                  </p>
                </>
              ) : viewMode === "preview" || viewMode === "selected" ? (
                <>
                  <p className="imageflow-info-kicker">Preview selection</p>
                  <h1 className="imageflow-info-title">Choose a preview</h1>
                  <p className="imageflow-info-subtitle">
                    Click a layout to make it the main panel.
                  </p>
                </>
              ) : (
                <>
                  <p className="imageflow-info-kicker">Image to Site</p>
                  <h1 className="imageflow-info-title">Conversion details</h1>
                  <p className="imageflow-info-subtitle">
                    Keep the brief tight. We will take the upload and translate
                    it into structure and components.
                  </p>
                </>
              )}
            </div>
            {viewMode === "nodes" ? (
              <div className="imageflow-info-fields">
                <div className="imageflow-slider-row">
                  <label className="imageflow-field">
                    <span className="imageflow-field-label">
                      Preview count: {previewCount}
                    </span>
                    <input
                      className="imageflow-slider"
                      type="range"
                      min="1"
                      max="6"
                      value={previewCount}
                      onChange={(event) =>
                        setPreviewCount(Number(event.target.value))
                      }
                    />
                  </label>
                  <label className="imageflow-field">
                    <span className="imageflow-field-label">
                      Speed: {speedValue}
                    </span>
                    <input
                      className="imageflow-slider"
                      type="range"
                      min="0"
                      max="100"
                      value={speedValue}
                      onChange={(event) =>
                        setSpeedValue(Number(event.target.value))
                      }
                    />
                  </label>
                  <label className="imageflow-field">
                    <span className="imageflow-field-label">
                      Quality: {qualityValue}
                    </span>
                    <input
                      className="imageflow-slider"
                      type="range"
                      min="0"
                      max="100"
                      value={qualityValue}
                      onChange={(event) =>
                        setSpeedValue(100 - Number(event.target.value))
                      }
                    />
                  </label>
                </div>
                <button
                  className="imageflow-generate-button"
                  type="button"
                  onClick={() => {
                    setSelectedPreviewIndex(0);
                    setViewMode("preview");
                  }}
                >
                  Generate previews
                </button>
              </div>
            ) : viewMode === "preview" || viewMode === "selected" ? (
              <div className="imageflow-info-fields">
                <button
                  className="imageflow-generate-button"
                  type="button"
                  onClick={() => setViewMode("preview")}
                >
                  Regenerate previews
                </button>
              </div>
            ) : (
              <>
                <div className="imageflow-info-fields">
                  <label className="imageflow-field">
                    <span className="imageflow-field-label">Title</span>
                    <input
                      className="imageflow-input-field"
                      type="text"
                      placeholder="Landing page"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>
                  <label className="imageflow-field">
                    <span className="imageflow-field-label">Name</span>
                    <input
                      className="imageflow-input-field"
                      type="text"
                      placeholder="Aurora Studio"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <label className="imageflow-field">
                    <span className="imageflow-field-label">Details</span>
                    <textarea
                      className="imageflow-textarea"
                      rows={6}
                      placeholder="Describe the layout, sections, and key elements."
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                    />
                  </label>
                </div>
                <button
                  className="imageflow-generate-button"
                  type="button"
                  onClick={() => setViewMode("nodes")}
                >
                  Generate site tree
                </button>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
