import { useState } from "react";
import { useImageToSite } from "./../../_context/image-to-site-context";

export default function PreviewGrid() {
  const { state, actions, derived } = useImageToSite();
  const [openHtmlIndex, setOpenHtmlIndex] = useState(null);

  return (
    <div
      className={`imageflow-previews imageflow-previews--${state.previewCount}`}
      aria-label="Generated previews"
      aria-busy={state.isGeneratingPreviews}
      style={{ "--preview-zoom": String(state.previewZoom) }}
    >
      <div className="imageflow-preview-toolbar">
        <span className="imageflow-preview-zoom-label">
          Zoom: {derived.previewZoomLabel}
        </span>
        <div className="imageflow-preview-zoom-controls">
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
      {state.previewError ? (
        <div className="imageflow-preview-error" role="status">
          {state.previewError}
        </div>
      ) : null}
      {Array.from({ length: state.previewCount }).map((_, index) => (
        <div
          key={`preview-${index}`}
          className={`imageflow-preview-card${
            state.selectedPreviewIndex === index ? " is-selected" : ""
          }${
            state.previewItems[index]?.imageUrl || state.previewItems[index]?.html
              ? " has-image"
              : ""
          }${state.previewItems[index]?.html ? " has-html" : ""}${
            state.isGeneratingPreviews ? " is-loading" : ""
          }`}
          role="button"
          tabIndex={0}
          onClick={() => actions.handleSelectPreview(index)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              actions.handleSelectPreview(index);
            }
          }}
        >
          {state.previewItems[index]?.html ? (
            <button
              type="button"
              className="imageflow-preview-code-button"
              onClick={(event) => {
                event.stopPropagation();
                setOpenHtmlIndex((current) =>
                  current === index ? null : index
                );
              }}
            >
              {openHtmlIndex === index ? "Hide HTML" : "View HTML"}
            </button>
          ) : null}
          {state.previewItems[index]?.imageUrl ? (
            <>
              <img
                className="imageflow-preview-media"
                src={state.previewItems[index].imageUrl}
                alt={`Preview ${index + 1}`}
                loading="lazy"
              />
              <div className="imageflow-preview-shade" aria-hidden="true" />
            </>
          ) : state.previewItems[index]?.html ? (
            <>
              <iframe
                className="imageflow-preview-media imageflow-preview-frame"
                title={`Preview ${index + 1} HTML`}
                sandbox=""
                loading="lazy"
                srcDoc={state.previewItems[index].html}
              />
              <div className="imageflow-preview-shade" aria-hidden="true" />
            </>
          ) : null}
          {openHtmlIndex === index && state.previewItems[index]?.html ? (
            <div
              className="imageflow-preview-html-panel"
              onClick={(event) => event.stopPropagation()}
            >
              <textarea
                className="imageflow-preview-html-textarea"
                readOnly
                value={state.previewItems[index].html}
              />
            </div>
          ) : null}
          <div className="imageflow-preview-meta">
            <span className="imageflow-preview-label">Preview {index + 1}</span>
            {state.previewItems[index]?.plan?.title ? (
              <span className="imageflow-preview-title">
                {state.previewItems[index].plan.title}
              </span>
            ) : null}
            {!(state.previewItems[index]?.imageUrl ||
              state.previewItems[index]?.html) ? (
              <span className="imageflow-preview-placeholder">
                {state.isGeneratingPreviews
                  ? "Generating..."
                  : state.previewItems[index]?.renderError ||
                    state.previewItems[index]?.error ||
                    "No preview yet"}
              </span>
            ) : null}
          </div>
          <button
            className="imageflow-preview-iterate"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              actions.handleIteratePreview(index);
            }}
          >
            Iterate
          </button>
        </div>
      ))}
    </div>
  );
}
