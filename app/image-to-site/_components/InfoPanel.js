import { useImageToSite } from "../_context/image-to-site-context";
import FileTree from "./FileTree";

export default function InfoPanel() {
  const { state, derived, actions } = useImageToSite();

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
                <p className="imageflow-info-kicker">Selected node</p>
                <h1 className="imageflow-info-title">
                  {derived.selectedNodeLabel}
                </h1>
                <p className="imageflow-info-subtitle">
                  Pick how many previews to generate for this node.
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
            <div className="imageflow-info-fields">
              <div className="imageflow-slider-row">
                <label className="imageflow-field">
                  <span className="imageflow-field-label">
                    Preview count: {state.previewCount}
                  </span>
                  <input
                    className="imageflow-slider"
                    type="range"
                    min="1"
                    max="6"
                    value={state.previewCount}
                    onChange={(event) =>
                      actions.setPreviewCount(Number(event.target.value))
                    }
                  />
                </label>
                <label className="imageflow-field">
                  <span className="imageflow-field-label">
                    Speed: {state.speedValue}
                  </span>
                  <input
                    className="imageflow-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={state.speedValue}
                    onChange={(event) =>
                      actions.setSpeedValue(Number(event.target.value))
                    }
                  />
                </label>
                <label className="imageflow-field">
                  <span className="imageflow-field-label">
                    Quality: {derived.qualityValue}
                  </span>
                  <input
                    className="imageflow-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={derived.qualityValue}
                    onChange={(event) =>
                      actions.setSpeedValue(100 - Number(event.target.value))
                    }
                  />
                </label>
              </div>
              <button
                className="imageflow-generate-button"
                type="button"
                onClick={() => {
                  actions.setSelectedPreviewIndex(0);
                  actions.setViewMode("preview");
                }}
              >
                Generate previews
              </button>
            </div>
          ) : state.viewMode === "preview" || state.viewMode === "selected" ? (
            <div className="imageflow-info-fields">
              <button
                className="imageflow-generate-button"
                type="button"
                onClick={() => actions.setViewMode("preview")}
              >
                Regenerate previews
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
                onClick={() => actions.setViewMode("nodes")}
              >
                Generate Website Structure
              </button>
            </>
          )}
        </>
      )}
    </aside>
  );
}
