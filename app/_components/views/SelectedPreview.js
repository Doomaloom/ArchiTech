import { useImageToSite } from "./../../_context/image-to-site-context";

export default function SelectedPreview() {
  const { state, actions } = useImageToSite();
  const preview = state.previewItems[state.selectedPreviewIndex];
  const hasImage = Boolean(preview?.imageUrl);

  return (
    <div className="imageflow-previews imageflow-previews--1">
      <div
        className={`imageflow-preview-card is-selected${
          hasImage ? " has-image" : ""
        }`}
        role="button"
        tabIndex={0}
        onClick={() => actions.setViewMode("iterate")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            actions.setViewMode("iterate");
          }
        }}
      >
        {hasImage ? (
          <>
            <img
              className="imageflow-preview-image"
              src={preview.imageUrl}
              alt={`Preview ${state.selectedPreviewIndex + 1}`}
              loading="lazy"
            />
            <div className="imageflow-preview-shade" aria-hidden="true" />
          </>
        ) : null}
        <div className="imageflow-preview-meta">
          <span className="imageflow-preview-label">
            Preview {state.selectedPreviewIndex + 1}
          </span>
          {preview?.plan?.title ? (
            <span className="imageflow-preview-title">{preview.plan.title}</span>
          ) : null}
          {!hasImage ? (
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
            actions.setViewMode("iterate");
          }}
        >
          Iterate
        </button>
      </div>
    </div>
  );
}
