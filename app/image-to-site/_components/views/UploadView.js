import { useImageToSite } from "../../_context/image-to-site-context";

export default function UploadView() {
  const { state, derived, actions } = useImageToSite();

  return (
    <>
      <input
        id="imageflow-upload"
        className="imageflow-file-input"
        type="file"
        accept="image/*"
        aria-label="Upload image"
        onChange={actions.handleFileChange}
      />
      <label className="imageflow-drop-content" htmlFor="imageflow-upload">
        {derived.activePreview ? (
          <img
            className="imageflow-preview"
            src={derived.activePreview}
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
            <span className="imageflow-drop-title">{derived.dropTitle}</span>
            <span className="imageflow-drop-meta">{derived.dropMeta}</span>
          </>
        )}
      </label>
      <div className="imageflow-file-row">
        {derived.hasFile ? (
          <div className="imageflow-file-chip">
            <span className="imageflow-file-name">{state.fileMeta.name}</span>
            <span className="imageflow-file-size">{derived.fileSizeLabel}</span>
          </div>
        ) : (
          <span className="imageflow-file-empty">
            Add an image to start the conversion.
          </span>
        )}
      </div>
    </>
  );
}
