"use client";

import { useRef, useState } from "react";
import useGrapesBuilder from "./../../_hooks/use-grapes-builder";
import { useImageToSite } from "./../../_context/image-to-site-context";
import useBuilderAnnotations from "./../../_hooks/use-builder-annotations";
import BuilderSidebarRail from "./../BuilderSidebarRail";

const normalizeRect = (rect) => {
  if (!rect) return { x: 0, y: 0, width: 0, height: 0 };
  const width = rect.width;
  const height = rect.height;
  const x = width < 0 ? rect.x + width : rect.x;
  const y = height < 0 ? rect.y + height : rect.y;
  return { x, y, width: Math.abs(width), height: Math.abs(height) };
};

const darkenHsl = (color) => {
  if (typeof color !== "string") return color;
  return color.replace(/(\d+)%\)\s*$/, (_, lightness) => {
    const next = Math.max(0, Math.min(100, Number(lightness) - 25));
    return `${next}%)`;
  });
};

const lightenHsl = (color) => {
  if (typeof color !== "string") return color;
  const match = color.match(
    /hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/
  );
  if (!match) return color;
  const [, h, s, l] = match;
  const nextL = Math.min(94, Number(l) + 18);
  const nextS = Math.max(8, Number(s) * 0.5);
  return `hsl(${h}, ${nextS}%, ${nextL}%)`;
};

const adjustTextareaSize = (element) => {
  if (!element) return;
  const minWidth = 60;
  const maxWidth = 240;
  const minHeight = 22;

  element.style.height = "auto";
  element.style.width = "auto";

  const targetWidth = Math.min(
    Math.max(element.scrollWidth, minWidth),
    maxWidth
  );
  element.style.width = `${targetWidth}px`;

  element.style.height = "auto";
  const targetHeight = Math.max(element.scrollHeight, minHeight);
  element.style.height = `${targetHeight}px`;
};

export default function BuilderView() {
  const { state, actions } = useImageToSite();
  const { containerRef, isReady, openLayersPanel, openStylesPanel } = useGrapesBuilder({
    htmlContent: state.builderHtml,
  });
  const annotations = useBuilderAnnotations();
  const fileInputRef = useRef(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState(null);

  const getOverlayPoint = (event) => {
    const rect = annotations.refs.overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const findAnnotationAtPoint = (point) => {
    if (!point) return null;
    for (const annotation of annotations.state.annotations) {
      const bounds =
        annotation.type === "rect"
          ? normalizeRect(annotation.rect)
          : (() => {
              if (!annotation.points?.length) return null;
              const xs = annotation.points.map((p) => p.x);
              const ys = annotation.points.map((p) => p.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              return {
                x: minX,
                y: minY,
                width: Math.max(maxX - minX, 1),
                height: Math.max(maxY - minY, 1),
              };
            })();
      if (!bounds) continue;
      const withinX = point.x >= bounds.x && point.x <= bounds.x + bounds.width;
      const withinY = point.y >= bounds.y && point.y <= bounds.y + bounds.height;
      if (withinX && withinY) {
        return annotation.id;
      }
    }
    return null;
  };

  const handleOverlayPointerMove = (event) => {
    const point = getOverlayPoint(event);
    const overId = findAnnotationAtPoint(point);
    setHoveredAnnotationId((current) =>
      current === overId ? current : overId ?? null
    );
    annotations.actions.handlePointerMove(event);
  };

  const handleOverlayPointerLeave = (event) => {
    setHoveredAnnotationId(null);
    annotations.actions.handlePointerUp(event);
  };

  return (
    <div className="imageflow-builder">
      <BuilderSidebarRail
        annotations={annotations}
        builderTuningValue={state.builderTuningValue}
        onBuilderTuningChange={actions.setBuilderTuningValue}
        onOpenLayers={openLayersPanel}
        onOpenStyles={openStylesPanel}
      />
      <div className="imageflow-builder-stage" aria-busy={!isReady}>
        <div className="imageflow-builder-canvas" ref={containerRef} />
        <div
          className={`builder-annotation-overlay${
            annotations.state.modeActive ? " is-active" : ""
          }`}
          ref={annotations.refs.overlayRef}
          onPointerDown={annotations.actions.handlePointerDown}
          onPointerMove={handleOverlayPointerMove}
          onPointerUp={annotations.actions.handlePointerUp}
          onPointerLeave={handleOverlayPointerLeave}
        >
          <svg className="builder-annotation-canvas">
            {annotations.state.annotations.map((annotation) =>
              annotation.type === "rect" ? (
                <rect
                  key={annotation.id}
                  {...normalizeRect(annotation.rect)}
                  stroke={annotation.color}
                  fill={annotation.color}
                  fillOpacity="0.1"
                  strokeWidth="3"
                  rx="4"
                  ry="4"
                />
              ) : (
                <polyline
                  key={annotation.id}
                  points={annotation.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  stroke={annotation.color}
                  fill={annotation.color}
                  fillOpacity="0.1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            )}
            {annotations.state.annotations.map((annotation) => {
              const bounds =
                annotation.type === "rect"
                  ? normalizeRect(annotation.rect)
                  : (() => {
                      if (!annotation.points?.length) return null;
                      const xs = annotation.points.map((p) => p.x);
                      const ys = annotation.points.map((p) => p.y);
                      const minX = Math.min(...xs);
                      const maxX = Math.max(...xs);
                      const minY = Math.min(...ys);
                      const maxY = Math.max(...ys);
                      return {
                        x: minX,
                        y: minY,
                        width: maxX - minX || 1,
                        height: maxY - minY || 1,
                      };
                    })();
              if (!bounds || !annotation.imageUrl) return null;
              const clipId = `clip-${annotation.id}`;
              const polygonPoints =
                annotation.type === "rect"
                  ? null
                  : annotation.points.map((p) => `${p.x},${p.y}`).join(" ");
              return (
                <g key={`${annotation.id}-img`}>
                  <clipPath id={clipId}>
                    {annotation.type === "rect" ? (
                      <rect {...bounds} rx="4" ry="4" />
                    ) : (
                      <polygon points={polygonPoints} />
                    )}
                  </clipPath>
                  <image
                    href={annotation.imageUrl}
                    x={bounds.x}
                    y={bounds.y}
                    width={bounds.width}
                    height={bounds.height}
                    preserveAspectRatio="xMidYMid slice"
                    opacity="0.6"
                    clipPath={`url(#${clipId})`}
                  />
                </g>
              );
            })}
            {annotations.state.activeDraw ? (
              annotations.state.activeDraw.type === "rect" ? (
                <rect
                  {...normalizeRect(annotations.state.activeDraw.rect)}
                  stroke={annotations.state.activeDraw.color}
                  fill={annotations.state.activeDraw.color}
                  fillOpacity="0.1"
                  strokeWidth="3"
                  rx="4"
                  ry="4"
                  strokeDasharray="8 6"
                />
              ) : (
                <polyline
                  points={annotations.state.activeDraw.points
                    .map((p) => `${p.x},${p.y}`)
                    .join(" ")}
                  stroke={annotations.state.activeDraw.color}
                  fill={annotations.state.activeDraw.color}
                  fillOpacity="0.1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="8 6"
                />
              )
            ) : null}
          </svg>
        </div>
        <div className="builder-annotation-notes">
          {annotations.state.annotations.map((annotation) => {
            const bounds =
              annotation.type === "rect"
                ? normalizeRect(annotation.rect)
                : (() => {
                    if (!annotation.points?.length) return null;
                    const xs = annotation.points.map((p) => p.x);
                    const ys = annotation.points.map((p) => p.y);
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);
                    return {
                      x: minX,
                      y: minY,
                      width: Math.max(maxX - minX, 1),
                      height: Math.max(maxY - minY, 1),
                    };
                  })();
            if (!bounds) return null;
            return (
              <div
                key={`${annotation.id}-note`}
                className="builder-annotation-note"
                style={{
                  left: bounds.x + bounds.width + 12,
                  top: bounds.y - 6,
                  borderColor: annotation.color,
                  color: darkenHsl(annotation.color),
                  backgroundColor: "rgba(255, 255, 255, 1)",
                }}
              >
                <textarea
                  value={annotation.note}
                  placeholder="Add a note..."
                  onFocus={(event) => adjustTextareaSize(event.target)}
                  onInput={(event) => adjustTextareaSize(event.target)}
                  onChange={(event) => {
                    adjustTextareaSize(event.target);
                    annotations.actions.handleNoteChange(
                      annotation.id,
                      event.target.value
                    );
                  }}
                  ref={(el) => el && adjustTextareaSize(el)}
                />
              </div>
            );
          })}
          {annotations.state.annotations.map((annotation) => {
            const bounds =
              annotation.type === "rect"
                ? normalizeRect(annotation.rect)
                : (() => {
                    if (!annotation.points?.length) return null;
                    const xs = annotation.points.map((p) => p.x);
                    const ys = annotation.points.map((p) => p.y);
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);
                    return {
                      x: minX,
                      y: minY,
                      width: Math.max(maxX - minX, 1),
                      height: Math.max(maxY - minY, 1),
                    };
                  })();
            if (!bounds) return null;
            return (
              <button
                key={`${annotation.id}-imgbtn`}
                type="button"
                className={`builder-annotation-image-button${
                  hoveredAnnotationId === annotation.id ? " is-visible" : ""
                }`}
                style={{
                  left: bounds.x + bounds.width / 2,
                  top: bounds.y + bounds.height / 2,
                  color: darkenHsl(annotation.color),
                }}
                onMouseEnter={() => setHoveredAnnotationId(annotation.id)}
                onMouseLeave={() => setHoveredAnnotationId(null)}
                onClick={() => {
                  annotations.actions.setPendingUploadId(annotation.id);
                  fileInputRef.current?.click();
                }}
                aria-label="Attach image"
                title="Attach image"
              >
                <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">
                  <path
                    d="M4 6a2 2 0 012-2h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M8.5 11.5l2.5 3 3.5-4 3 4.5H7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="9" cy="8.5" r="1.2" fill="currentColor" opacity="0.5" />
                </svg>
              </button>
            );
          })}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="builder-annotation-file-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            const targetId = annotations.pendingUploadId;
            if (file && targetId) {
              annotations.actions.handleImageUpload(targetId, file);
            }
            event.target.value = "";
          }}
          aria-hidden="true"
        />
        {!isReady ? (
          <div className="imageflow-builder-loader">
            <div className="imageflow-editor-loader">Loading GrapesJS...</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
