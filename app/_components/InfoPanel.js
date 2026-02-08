import { useImageToSite } from "./../_context/image-to-site-context";
import FileTree from "./FileTree";
import PreviewGenerationControls from "./PreviewGenerationControls";

const resolveChildren = (node) =>
  node?.children || node?.items || node?.pages || node?.nodes || [];

const resolveRoot = (structureFlow) => {
  if (!structureFlow) {
    return null;
  }
  if (structureFlow.root && typeof structureFlow.root === "object") {
    return structureFlow.root;
  }
  return structureFlow;
};

const findSelectedNodeMeta = ({ structureFlow, selectedNodeId }) => {
  const root = resolveRoot(structureFlow);
  if (!root || !selectedNodeId) {
    return null;
  }

  const stack = [{ node: root, depth: 0, path: [], parent: null }];
  while (stack.length) {
    const current = stack.pop();
    const node = current.node;
    if (!node || typeof node !== "object") {
      continue;
    }

    const id = node.id?.toString();
    if (!id) {
      continue;
    }

    const label = node.label?.toString() || id;
    const nextPath = [...current.path, label];
    if (id === selectedNodeId?.toString()) {
      return {
        depth: current.depth,
        parentLabel: current.parent?.label?.toString() || "Root",
        childCount: resolveChildren(node).length,
        path: nextPath,
      };
    }

    const children = resolveChildren(node);
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = children[i];
      if (!child || typeof child !== "object") {
        continue;
      }
      stack.push({
        node: child,
        depth: current.depth + 1,
        path: nextPath,
        parent: node,
      });
    }
  }

  return null;
};

export default function InfoPanel() {
  const { state, derived, actions } = useImageToSite();
  const isNodesView = state.viewMode === "nodes";
  const isPreviewView = state.viewMode === "preview" || state.viewMode === "selected";
  const isCodeView = state.viewMode === "code";
  const isConversionView = !isNodesView && !isPreviewView && !isCodeView;
  const selectedNodeMeta = isNodesView
    ? findSelectedNodeMeta({
        structureFlow: state.structureFlow,
        selectedNodeId: state.selectedNodeId,
      })
    : null;
  const pathLabel = selectedNodeMeta?.path?.length
    ? selectedNodeMeta.path.join(" / ")
    : "Select a node in the graph";
  const hasGeneratedPreviews = Boolean(
    state.previewItems?.some((item) => item?.imageUrl || item?.html)
  );
  const hasTitle = Boolean(state.title?.trim());
  const hasName = Boolean(state.name?.trim());
  const hasDetails = Boolean(state.details?.trim());

  const infoClassName = `imageflow-info translate-info-panel${
    !isCodeView ? " translate-glass-info" : ""
  }${isNodesView ? " translate-nodes-info" : ""}${
    isConversionView ? " translate-conversion-info" : ""
  }`;

  return (
    <aside className={infoClassName}>
      {isCodeView ? (
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
            {isNodesView ? (
              <>
                <p className="imageflow-info-kicker">Selected node</p>
                <h1 className="imageflow-info-title">
                  {derived.selectedNodeLabel}
                </h1>
                <p className="imageflow-info-subtitle">
                  Tune node-level generation settings and produce focused
                  previews.
                </p>
              </>
            ) : isPreviewView ? (
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
          {isNodesView ? (
            <>
              <div className="translate-node-summary" role="note">
                <div className="translate-node-summary-item">
                  <span>Depth</span>
                  <strong>{selectedNodeMeta?.depth ?? "-"}</strong>
                </div>
                <div className="translate-node-summary-item">
                  <span>Parent</span>
                  <strong>{selectedNodeMeta?.parentLabel || "-"}</strong>
                </div>
                <div className="translate-node-summary-item">
                  <span>Children</span>
                  <strong>{selectedNodeMeta?.childCount ?? 0}</strong>
                </div>
              </div>
              <p className="translate-node-path">{pathLabel}</p>
              <div className="translate-node-flow" role="note">
                <span className="translate-node-flow-title">Workflow</span>
                <div className="translate-node-flow-track">
                  <span className="translate-node-flow-chip is-ready">
                    1 Node selected
                  </span>
                  <span
                    className={`translate-node-flow-chip${
                      hasGeneratedPreviews ? " is-ready" : ""
                    }`}
                  >
                    2 Generate previews
                  </span>
                  <span
                    className={`translate-node-flow-chip${
                      hasGeneratedPreviews ? " is-ready" : ""
                    }`}
                  >
                    3 Open best result
                  </span>
                </div>
              </div>
              <PreviewGenerationControls
                previewCount={state.previewCount}
                quality={state.modelQuality}
                creativityValue={state.creativityValue}
                onPreviewCountChange={actions.setPreviewCount}
                onQualityChange={actions.setModelQuality}
                onCreativityChange={actions.setCreativityValue}
                onGenerate={actions.handleGeneratePreviews}
                isGenerating={state.isGeneratingPreviews}
                errorMessage={state.previewError}
                className="translate-nodes-controls"
              />
            </>
          ) : isPreviewView ? (
            <div className="imageflow-info-fields">
              <button
                className="imageflow-generate-button"
                type="button"
                onClick={actions.handleGeneratePreviews}
                disabled={state.isGeneratingPreviews}
              >
                {state.isGeneratingPreviews
                  ? "Generating previews..."
                  : "Regenerate previews"}
              </button>
            </div>
          ) : (
            <>
              <div className="translate-conversion-summary" role="note">
                <span
                  className={`translate-conversion-chip${
                    hasTitle ? " is-ready" : ""
                  }`}
                >
                  1 Set title
                </span>
                <span
                  className={`translate-conversion-chip${
                    hasName ? " is-ready" : ""
                  }`}
                >
                  2 Add brand
                </span>
                <span
                  className={`translate-conversion-chip${
                    hasDetails ? " is-ready" : ""
                  }`}
                >
                  3 Define details
                </span>
                <span
                  className={`translate-conversion-chip${
                    derived.hasFile ? " is-ready" : ""
                  }`}
                >
                  4 Upload image
                </span>
              </div>
              <div className="imageflow-info-fields translate-conversion-fields">
                <div className="translate-conversion-row">
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
                </div>
                <label className="imageflow-field">
                  <span className="imageflow-field-label">Details</span>
                  <textarea
                    className="imageflow-textarea translate-conversion-textarea"
                    rows={5}
                    placeholder="Describe the layout, sections, and key elements."
                    value={state.details}
                    onChange={(event) => actions.setDetails(event.target.value)}
                  />
                </label>
              </div>
              <div className="translate-conversion-actions">
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
              </div>
            </>
          )}
        </>
      )}
    </aside>
  );
}
