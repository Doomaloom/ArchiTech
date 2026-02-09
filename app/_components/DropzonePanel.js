import { useImageToSite } from "./../_context/image-to-site-context";
import MediaControls from "./MediaControls";
import CodeEditorView from "./views/CodeEditorView";
import IterateView from "./views/IterateView";
import NodesView from "./views/NodesView";
import PreviewGrid from "./views/PreviewGrid";
import SelectedPreview from "./views/SelectedPreview";
import UploadView from "./views/UploadView";
import BuilderView from "./views/BuilderView";
import BuildFlow from "./build-flow";

export default function DropzonePanel() {
  const { state, derived, actions } = useImageToSite();
  const isBuilderMode =
    state.viewMode === "builder" || state.viewMode === "build-app";

  return (
    <section
      className={`imageflow-dropzone${derived.hasFile ? " is-ready" : ""}${
        state.isDragging ? " is-dragging" : ""
      }${state.viewMode === "nodes" ? " is-tree" : ""}${
        derived.isPreviewMode ? " is-preview" : ""
      }${state.viewMode === "code" ? " is-code" : ""}${
        isBuilderMode ? " is-builder" : ""
      }`}
      onDragOver={actions.handleDragOver}
      onDragLeave={actions.handleDragLeave}
      onDrop={actions.handleDrop}
    >
      {state.viewMode === "code" ? (
        <CodeEditorView />
      ) : state.viewMode === "builder" ? (
        <BuilderView />
      ) : state.viewMode === "build-app" ? (
        <BuildFlow />
      ) : (
        <>
          {derived.isIterationMode ? null : <MediaControls />}
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
