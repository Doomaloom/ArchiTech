import { useImageToSite } from "../_context/image-to-site-context";

export default function MediaControls() {
  const { actions } = useImageToSite();

  return (
    <div className="imageflow-media-controls" aria-label="Image tools">
      <button
        className="imageflow-control-button"
        type="button"
        aria-label="Previous image"
        onClick={actions.handlePrevImage}
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
        onClick={actions.handleDeleteImage}
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
        onClick={actions.handleNextImage}
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
  );
}
