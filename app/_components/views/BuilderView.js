"use client";

import { useRef } from "react";
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

export default function BuilderView() {
  const { state, actions } = useImageToSite();
  const { containerRef, isReady } = useGrapesBuilder({
    htmlContent: state.builderHtml,
  });
  const annotations = useBuilderAnnotations();
  const fileInputRef = useRef(null);

  return (
    <div className="imageflow-builder">
      <BuilderSidebarRail
        annotations={annotations}
        builderTuningValue={state.builderTuningValue}
        onBuilderTuningChange={actions.setBuilderTuningValue}
      />
      <div className="imageflow-builder-stage" aria-busy={!isReady}>
        <div className="imageflow-builder-canvas" ref={containerRef} />
        <div
          className={`builder-annotation-overlay${
            annotations.state.modeActive ? " is-active" : ""
          }`}
          ref={annotations.refs.overlayRef}
          onPointerDown={annotations.actions.handlePointerDown}
          onPointerMove={annotations.actions.handlePointerMove}
          onPointerUp={annotations.actions.handlePointerUp}
          onPointerLeave={annotations.actions.handlePointerUp}
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
            const anchor =
              annotation.type === "rect"
                ? normalizeRect(annotation.rect)
                : annotation.points[0];
            if (!anchor) return null;
            return (
              <div
                key={`${annotation.id}-note`}
                className="builder-annotation-note"
                style={{
                  left: anchor.x + 12,
                  top: anchor.y + 12,
                  borderColor: annotation.color,
                  color: annotation.color,
                }}
              >
                <textarea
                  value={annotation.note}
                  placeholder="Add a note..."
                  onChange={(event) =>
                    annotations.actions.handleNoteChange(
                      annotation.id,
                      event.target.value
                    )
                  }
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
                className="builder-annotation-image-button"
                style={{
                  left: bounds.x + bounds.width / 2,
                  top: bounds.y + bounds.height / 2,
                  color: annotation.color,
                  borderColor: annotation.color,
                }}
                onClick={() => {
                  annotations.actions.setPendingUploadId(annotation.id);
                  fileInputRef.current?.click();
                }}
                aria-label="Attach image"
                title="Attach image"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
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
