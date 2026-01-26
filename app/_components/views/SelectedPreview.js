import { useImageToSite } from "./../../_context/image-to-site-context";

export default function SelectedPreview() {
  const { state, actions } = useImageToSite();

  return (
    <div className="imageflow-previews imageflow-previews--1">
      <div
        className="imageflow-preview-card is-selected"
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
        <span className="imageflow-preview-label">
          Preview {state.selectedPreviewIndex + 1}
        </span>
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
