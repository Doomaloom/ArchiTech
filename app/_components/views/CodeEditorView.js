import dynamic from "next/dynamic";
import { EDITOR_OPTIONS, handleEditorWillMount } from "./../../_lib/editor";
import { useImageToSite } from "./../../_context/image-to-site-context";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="imageflow-editor-loader">Loading editor...</div>,
});

export default function CodeEditorView() {
  const { state, derived, actions } = useImageToSite();

  return (
    <div className="imageflow-code-editor" aria-label="Code editor">
      <div className="imageflow-code-tabs" role="tablist">
        {state.openCodeTabs.map((tab) => {
          const isActive = tab.id === state.activeCodeFileId;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              className={
                isActive ? "imageflow-code-tab is-active" : "imageflow-code-tab"
              }
              onClick={() => actions.handleOpenCodeFile(tab)}
            >
              <span className="imageflow-code-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="imageflow-editor-frame">
        <MonacoEditor
          language={derived.activeCodeLanguage}
          theme="imageflow-light"
          value={derived.activeCodeContent}
          height="100%"
          width="100%"
          onChange={actions.handleEditorChange}
          beforeMount={handleEditorWillMount}
          options={EDITOR_OPTIONS}
        />
      </div>
      {state.isDragging ? (
        <div className="imageflow-drop-overlay">
          Drop files to add them to the workspace.
        </div>
      ) : null}
    </div>
  );
}
