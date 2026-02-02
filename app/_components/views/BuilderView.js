"use client";

import useGrapesBuilder from "./../../_hooks/use-grapes-builder";
import { useImageToSite } from "./../../_context/image-to-site-context";

export default function BuilderView() {
  const { actions } = useImageToSite();
  const { containerRef, isReady } = useGrapesBuilder();

  return (
    <div className="imageflow-builder">
      <div className="imageflow-builder-actions is-floating">
        <button
          type="button"
          className="imageflow-generate-button is-ghost"
          onClick={() => actions.setViewMode("preview")}
        >
          Back to previews
        </button>
      </div>
      <div className="imageflow-builder-stage" aria-busy={!isReady}>
        <div className="imageflow-builder-canvas" ref={containerRef} />
        {!isReady ? (
          <div className="imageflow-builder-loader">
            <div className="imageflow-editor-loader">Loading GrapesJS...</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
