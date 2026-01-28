import { useImageToSite } from "./../../_context/image-to-site-context";

export default function PreviewGrid() {
  const { state, actions, derived } = useImageToSite();

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
          }${state.previewItems[index]?.imageUrl ? " has-image" : ""}${
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
          {state.previewItems[index]?.imageUrl ? (
            <>
              <img
                className="imageflow-preview-image"
                src={state.previewItems[index].imageUrl}
                alt={`Preview ${index + 1}`}
                loading="lazy"
              />
              <div className="imageflow-preview-shade" aria-hidden="true" />
            </>
          ) : null}
          <div className="imageflow-preview-meta">
            <span className="imageflow-preview-label">Preview {index + 1}</span>
            {state.previewItems[index]?.plan?.title ? (
              <span className="imageflow-preview-title">
                {state.previewItems[index].plan.title}
              </span>
            ) : null}
            {!state.previewItems[index]?.imageUrl ? (
              <span className="imageflow-preview-placeholder">
                {state.isGeneratingPreviews ? "Generating..." : "No preview yet"}
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
