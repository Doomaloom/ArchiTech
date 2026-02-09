import { useImageToSite } from "./../_context/image-to-site-context";
import FileTree from "./FileTree";
import PreviewGenerationControls from "./PreviewGenerationControls";

const getTreeChildren = (node) => {
  if (!node || typeof node !== "object") {
    return [];
  }
  if (Array.isArray(node.children)) {
    return node.children;
  }
  if (Array.isArray(node.items)) {
    return node.items;
  }
  if (Array.isArray(node.pages)) {
    return node.pages;
  }
  if (Array.isArray(node.nodes)) {
    return node.nodes;
  }
  return [];
};

const getStructureRoot = (tree) => {
  if (!tree || typeof tree !== "object") {
    return null;
  }
  if (tree.root && typeof tree.root === "object") {
    return tree.root;
  }
  return tree;
};

export default function InfoPanel() {
  const { state, derived, actions } = useImageToSite();
  const structureRoot = getStructureRoot(state.structureFlow);
  const previewPageCount = Math.max(
    getTreeChildren(structureRoot).length || (structureRoot ? 1 : 0),
    1
  );

  return (
    <aside className="imageflow-info">
      {state.viewMode === "code" ? (
        <div className="imageflow-agent">
          <div className="imageflow-panel-switch">
            <button
              type="button"
              className={
                state.codePanelMode === "agent"
                  ? "imageflow-switch-button is-active"
                  : "imageflow-switch-button"
              }
              onClick={() => actions.setCodePanelMode("agent")}
            >
              Agent
            </button>
            <button
              type="button"
              className={
                state.codePanelMode === "files"
                  ? "imageflow-switch-button is-active"
                  : "imageflow-switch-button"
              }
              onClick={() => actions.setCodePanelMode("files")}
            >
              Files
            </button>
          </div>
          {state.codePanelMode === "agent" ? (
            <>
              <div className="imageflow-agent-header">
                <p className="imageflow-info-kicker">Gem Code Agent</p>
                <h1 className="imageflow-info-title">Code assistant</h1>
                <p className="imageflow-info-subtitle">
                  Ask for refactors, new components, or layout conversions.
                </p>
              </div>
              <div className="imageflow-agent-messages" role="log">
                {state.agentMessages.map((message, index) => (
                  <div
                    key={`agent-${index}`}
                    className={`imageflow-agent-bubble is-${message.role}`}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
              <div className="imageflow-agent-input">
                <textarea
                  className="imageflow-agent-textarea"
                  rows={3}
                  placeholder="Describe the change you want applied..."
                  value={state.agentInput}
                  onChange={(event) => actions.setAgentInput(event.target.value)}
                />
                <button
                  className="imageflow-generate-button"
                  type="button"
                  onClick={actions.handleAgentSend}
                >
                  Send request
                </button>
              </div>
            </>
          ) : (
            <div className="imageflow-file-selector">
              {derived.codeTreeGroups.map((group) => {
                const groupKey = `group/${group.label}`;
                const isGroupCollapsed = state.collapsedFolders[groupKey];
                return (
                  <div key={group.label} className="imageflow-file-group">
                    <button
                      type="button"
                      className="imageflow-file-group-toggle imageflow-file-node"
                      style={{ "--indent": 0 }}
                      onClick={() => actions.handleToggleFolder(groupKey)}
                      aria-expanded={!isGroupCollapsed}
                    >
                      <span
                        className={`imageflow-file-chevron${
                          isGroupCollapsed ? " is-collapsed" : ""
                        }`}
                        aria-hidden="true"
                      />
                      <span className="imageflow-file-folder-name">
                        {group.label}
                      </span>
                    </button>
                    {isGroupCollapsed ? null : (
                      <div className="imageflow-file-list">
                        <FileTree
                          nodes={group.tree}
                          groupLabel={group.label}
                          collapsedFolders={state.collapsedFolders}
                          onToggleFolder={actions.handleToggleFolder}
                          activeCodeFileId={state.activeCodeFileId}
                          onOpenFile={actions.handleOpenCodeFile}
                          depth={1}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="imageflow-info-header">
            {state.viewMode === "nodes" ? (
              <>
                <p className="imageflow-info-kicker">Structure ready</p>
                <h1 className="imageflow-info-title">Generate page previews</h1>
                <p className="imageflow-info-subtitle">
                  Creates one HTML preview for each top-level page in the tree.
                </p>
              </>
            ) : state.viewMode === "preview" || state.viewMode === "selected" ? (
              <>
                <p className="imageflow-info-kicker">Preview selection</p>
                <h1 className="imageflow-info-title">Choose a preview</h1>
                <p className="imageflow-info-subtitle">
                  Click a layout to make it the main panel.
                </p>
              </>
            ) : (
              <>
                <p className="imageflow-info-kicker">Image to Site</p>
                <h1 className="imageflow-info-title">Conversion details</h1>
                <p className="imageflow-info-subtitle">
                  Keep the brief tight. We will take the upload and translate it
                  into structure and components.
                </p>
              </>
            )}
          </div>
          {state.viewMode === "nodes" ? (
            <PreviewGenerationControls
              previewCount={previewPageCount}
              quality={state.modelQuality}
              creativityValue={state.creativityValue}
              onPreviewCountChange={() => {}}
              onQualityChange={actions.setModelQuality}
              onCreativityChange={actions.setCreativityValue}
              onGenerate={actions.handleGeneratePreviews}
              isGenerating={state.isGeneratingPreviews}
              errorMessage={state.previewError}
            />
          ) : state.viewMode === "preview" || state.viewMode === "selected" ? (
            <div className="imageflow-info-fields">
              <button
                className="imageflow-generate-button"
                type="button"
                onClick={actions.handleGeneratePreviews}
                disabled={state.isGeneratingPreviews}
              >
                {state.isGeneratingPreviews
                  ? "Generating page previews..."
                  : "Regenerate page previews"}
              </button>
            </div>
          ) : (
            <>
              <div className="imageflow-info-fields">
                <label className="imageflow-field">
                  <span className="imageflow-field-label">Title</span>
                  <input
                    className="imageflow-input-field"
                    type="text"
                    placeholder="Landing page"
                    value={state.title}
                    onChange={(event) => actions.setTitle(event.target.value)}
                  />
                </label>
                <label className="imageflow-field">
                  <span className="imageflow-field-label">Name</span>
                  <input
                    className="imageflow-input-field"
                    type="text"
                    placeholder="Aurora Studio"
                    value={state.name}
                    onChange={(event) => actions.setName(event.target.value)}
                  />
                </label>
                <label className="imageflow-field">
                  <span className="imageflow-field-label">Details</span>
                  <textarea
                    className="imageflow-textarea"
                    rows={6}
                    placeholder="Describe the layout, sections, and key elements."
                    value={state.details}
                    onChange={(event) => actions.setDetails(event.target.value)}
                  />
                </label>
              </div>
              <button
                className="imageflow-generate-button"
                type="button"
                onClick={actions.handleGenerateStructure}
                disabled={state.isGeneratingStructure || !derived.hasFile}
              >
                {state.isGeneratingStructure
                  ? "Generating Structure..."
                  : "Generate Website Structure"}
              </button>
              {state.generationError ? (
                <p className="imageflow-error">{state.generationError}</p>
              ) : null}
            </>
          )}
        </>
      )}
    </aside>
  );
}
