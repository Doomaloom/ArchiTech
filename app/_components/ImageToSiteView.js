import DropzonePanel from "./DropzonePanel";
import GalleryPanel from "./GalleryPanel";
import InfoPanel from "./InfoPanel";
import ImageflowMenuBar from "./ImageflowMenuBar";
import ImageflowRulers from "./ImageflowRulers";
import { useImageToSite } from "./../_context/image-to-site-context";

export default function ImageToSiteView() {
  const { state, derived } = useImageToSite();
  const isBuilder = state.viewMode === "builder";
  const hideSidePanels = state.viewMode === "code" || isBuilder;
  const layoutClassName = `imageflow-layout${
    isBuilder ? " is-builder" : hideSidePanels ? " is-code" : ""
  }${derived.isPreviewMode ? " is-preview-only" : ""}`;

  return (
    <div className="imageflow-shell">
      <div className="imageflow-panel">
        <ImageflowMenuBar />
        <ImageflowRulers />
        <div className={layoutClassName}>
          <DropzonePanel />
          {hideSidePanels || derived.isPreviewMode ? null : (
            <GalleryPanel />
          )}
          {derived.isPreviewMode || hideSidePanels ? null : <InfoPanel />}
        </div>
      </div>
    </div>
  );
}
