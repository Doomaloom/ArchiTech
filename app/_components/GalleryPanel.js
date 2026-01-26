import { useImageToSite } from "./../_context/image-to-site-context";

export default function GalleryPanel() {
  const { state, derived, actions } = useImageToSite();

  return (
    <section className="imageflow-gallery" aria-label="Uploaded gallery">
      <div className="imageflow-gallery-header">
        <span className="imageflow-gallery-title">Gallery</span>
        <span className="imageflow-gallery-meta">
          {derived.hasFile ? "Latest upload highlighted" : "Awaiting uploads"}
        </span>
      </div>
      <div className="imageflow-thumbs">
        {state.gallery.length ? (
          state.gallery.map((src, index) => (
            <button
              key={`thumb-${src}`}
              className={`imageflow-thumb${
                index === state.activeIndex ? " is-active" : ""
              }`}
              type="button"
              onClick={() => actions.setActiveIndex(index)}
            >
              <img src={src} alt="" />
            </button>
          ))
        ) : (
          <div className="imageflow-thumb is-empty" aria-hidden="true" />
        )}
      </div>
    </section>
  );
}
