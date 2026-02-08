import { useImageToSite } from "./../_context/image-to-site-context";
import CodeEditorView from "./views/CodeEditorView";
import IterateView from "./views/IterateView";
import NodesView from "./views/NodesView";
import PreviewGrid from "./views/PreviewGrid";
import SelectedPreview from "./views/SelectedPreview";
import UploadView from "./views/UploadView";
import BuilderView from "./views/BuilderView";

export default function DropzonePanel() {
  const { state, derived, actions } = useImageToSite();

  return (
    <section
      className={`imageflow-dropzone${derived.hasFile ? " is-ready" : ""}${
        state.isDragging ? " is-dragging" : ""
      }${state.viewMode === "nodes" ? " is-tree" : ""}${
        derived.isPreviewMode ? " is-preview" : ""
      }${state.viewMode === "code" ? " is-code" : ""}${
        state.viewMode === "builder" ? " is-builder" : ""
      }`}
      onDragOver={actions.handleDragOver}
      onDragLeave={actions.handleDragLeave}
      onDrop={actions.handleDrop}
    >
      {state.viewMode === "code" ? (
        <CodeEditorView />
      ) : state.viewMode === "builder" ? (
        <BuilderView />
      ) : (
        <>
          {state.viewMode === "nodes" ? (
            <NodesView />
          ) : state.viewMode === "preview" ? (
            <PreviewGrid />
          ) : state.viewMode === "iterate" ? (
            <IterateView />
          ) : state.viewMode === "selected" ? (
            <SelectedPreview />
          ) : (
            <UploadView />
          )}
        </>
      )}
    </section>
  );
}
