import { useImageToSite } from "../../_context/image-to-site-context";

export default function PreviewGrid() {
  const { state, actions } = useImageToSite();

  return (
    <div
      className={`imageflow-previews imageflow-previews--${state.previewCount}`}
      aria-label="Generated previews"
    >
      {Array.from({ length: state.previewCount }).map((_, index) => (
        <div
          key={`preview-${index}`}
          className={`imageflow-preview-card${
            state.selectedPreviewIndex === index ? " is-selected" : ""
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
          <span className="imageflow-preview-label">Preview {index + 1}</span>
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
