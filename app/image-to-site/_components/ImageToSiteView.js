import DropzonePanel from "./DropzonePanel";
import GalleryPanel from "./GalleryPanel";
import InfoPanel from "./InfoPanel";
import { useImageToSite } from "../_context/image-to-site-context";

export default function ImageToSiteView() {
  const { state, derived } = useImageToSite();

  return (
    <div className="imageflow-shell">
      <div className="imageflow-panel">
        <div
          className={`imageflow-layout${
            state.viewMode === "code" ? " is-code" : ""
          }${derived.isPreviewMode ? " is-preview-only" : ""}`}
        >
          <DropzonePanel />
          {state.viewMode === "code" || derived.isPreviewMode ? null : (
            <GalleryPanel />
          )}
          {derived.isPreviewMode ? null : <InfoPanel />}
        </div>
      </div>
    </div>
  );
}
