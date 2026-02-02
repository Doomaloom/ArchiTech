import { useState } from "react";
import { useImageToSite } from "./../../_context/image-to-site-context";

export default function SelectedPreview() {
  const { state, actions, derived } = useImageToSite();
  const [showHtml, setShowHtml] = useState(false);
  const preview = state.previewItems[state.selectedPreviewIndex];
  const hasImage = Boolean(preview?.imageUrl);
  const hasPreview = Boolean(preview?.imageUrl || preview?.html);

  return (
    <div
      className="imageflow-previews imageflow-previews--1"
      style={{ "--preview-zoom": String(state.previewZoom) }}
    >
      <div className="imageflow-preview-toolbar">
        <span className="imageflow-preview-zoom-label">
          Zoom: {derived.previewZoomLabel}
        </span>
        <div className="imageflow-preview-zoom-controls">
          {preview?.html ? (
            <button
              type="button"
              className="imageflow-preview-zoom-button"
              onClick={() => setShowHtml((current) => !current)}
            >
              {showHtml ? "Hide HTML" : "View HTML"}
            </button>
          ) : null}
          <button
            type="button"
            className="imageflow-preview-zoom-button"
            onClick={actions.handlePreviewZoomOut}
            disabled={!derived.canPreviewZoomOut}
          >
            Zoom out
          </button>
          <button
            type="button"
            className="imageflow-preview-zoom-button"
            onClick={actions.handlePreviewZoomReset}
            disabled={!derived.canPreviewZoomReset}
          >
            Reset
          </button>
        </div>
      </div>
      <div
        className={`imageflow-preview-card is-selected${
          hasPreview ? " has-image" : ""
        }${preview?.html ? " has-html" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => actions.handleSelectPreview(state.selectedPreviewIndex)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            actions.handleSelectPreview(state.selectedPreviewIndex);
          }
        }}
      >
        {hasImage ? (
          <>
            <img
              className="imageflow-preview-media"
              src={preview.imageUrl}
              alt={`Preview ${state.selectedPreviewIndex + 1}`}
              loading="lazy"
            />
            <div className="imageflow-preview-shade" aria-hidden="true" />
          </>
        ) : preview?.html ? (
          <>
            <iframe
              className="imageflow-preview-media imageflow-preview-frame"
              title={`Preview ${state.selectedPreviewIndex + 1} HTML`}
              sandbox=""
              loading="lazy"
              srcDoc={preview.html}
            />
            <div className="imageflow-preview-shade" aria-hidden="true" />
          </>
        ) : null}
        {showHtml && preview?.html ? (
          <div
            className="imageflow-preview-html-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <textarea
              className="imageflow-preview-html-textarea"
              readOnly
              value={preview.html}
            />
          </div>
        ) : null}
        <div className="imageflow-preview-meta">
          <span className="imageflow-preview-label">
            Preview {state.selectedPreviewIndex + 1}
          </span>
          {preview?.plan?.title ? (
            <span className="imageflow-preview-title">{preview.plan.title}</span>
          ) : null}
          {!hasPreview ? (
            <span className="imageflow-preview-placeholder">
              {state.isGeneratingPreviews
                ? "Generating..."
                : preview?.renderError || preview?.error || "No preview yet"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
