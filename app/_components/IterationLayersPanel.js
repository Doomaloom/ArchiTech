import { useMemo, useRef, useState } from "react";

export default function IterationLayersPanel({
  layerFolders,
  ungroupedLayerEntries,
  selectedElementIds,
  onSelectLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onCreateFolder,
  onClose,
  onRenameFolder,
  onRemoveFolder,
  onToggleFolderCollapse,
  onAddSelectionToFolder,
  onToggleFolderVisibility,
  onToggleFolderLock,
}) {
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [folderNameDraft, setFolderNameDraft] = useState("");
  const lastSelectedIdRef = useRef(null);

  const visibleLayerIds = useMemo(() => {
    const ids = [];
    layerFolders.forEach((folder) => {
      if (folder.collapsed) {
        return;
      }
      folder.layers.forEach((entry) => ids.push(entry.id));
    });
    ungroupedLayerEntries.forEach((entry) => ids.push(entry.id));
    return ids;
  }, [layerFolders, ungroupedLayerEntries]);

  const handleLayerSelect = (event, id) => {
    if (!onSelectLayer) {
      return;
    }
    const isShift = event?.shiftKey;
    const isToggle = event?.metaKey || event?.ctrlKey;
    if (isShift && lastSelectedIdRef.current && visibleLayerIds.length) {
      const startIndex = visibleLayerIds.indexOf(lastSelectedIdRef.current);
      const endIndex = visibleLayerIds.indexOf(id);
      if (startIndex !== -1 && endIndex !== -1) {
        const [start, end] =
          startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        onSelectLayer(visibleLayerIds.slice(start, end + 1));
        lastSelectedIdRef.current = id;
        return;
      }
    }
    if (isToggle) {
      const exists = selectedElementIds.includes(id);
      const next = exists
        ? selectedElementIds.filter((entry) => entry !== id)
        : [...selectedElementIds, id];
      onSelectLayer(next);
      lastSelectedIdRef.current = id;
      return;
    }
    onSelectLayer([id]);
    lastSelectedIdRef.current = id;
  };

  const startEditingFolder = (folder) => {
    setEditingFolderId(folder.id);
    setFolderNameDraft(folder.name);
  };

  const commitFolderName = (folder) => {
    if (editingFolderId !== folder.id) {
      return;
    }
    const nextName = folderNameDraft.trim();
    if (nextName && nextName !== folder.name) {
      onRenameFolder(folder.id, nextName);
    }
    setEditingFolderId(null);
  };

  const renderLayerRow = (entry, isNested = false) => {
    const layer = entry.layer;
    const isSelected = selectedElementIds.includes(entry.id);
    return (
      <div
        key={entry.id}
        className={`imageflow-layer-row${isSelected ? " is-active" : ""}${
          layer.locked ? " is-locked" : ""
        }${layer.hidden ? " is-hidden" : ""}${
          isNested ? " is-nested" : ""
        }`}
      >
        <button
          className="imageflow-layer-name"
          type="button"
          onClick={(event) => handleLayerSelect(event, entry.id)}
        >
          <span className="imageflow-layer-label">{layer.name}</span>
        </button>
        <div className="imageflow-layer-actions">
          <button
            className="imageflow-layer-action"
            type="button"
            onClick={() => onToggleLayerVisibility(entry.id)}
            aria-pressed={!layer.hidden}
            aria-label={layer.hidden ? "Show layer" : "Hide layer"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </button>
          <button
            className="imageflow-layer-action"
            type="button"
            onClick={() => onToggleLayerLock(entry.id)}
            aria-pressed={layer.locked}
            aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect
                x="6"
                y="10"
                width="12"
                height="10"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M8 10V8a4 4 0 018 0v2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const hasFolders = layerFolders.length > 0;
  const hasUngrouped = ungroupedLayerEntries.length > 0;

  return (
    <aside className="imageflow-iteration-layers">
      <div className="imageflow-iteration-layers-header">
        <span className="imageflow-iteration-layers-title">Layers</span>
        <div className="imageflow-iteration-layers-actions">
          <button
            className="imageflow-layer-create"
            type="button"
            onClick={onCreateFolder}
          >
            New Folder
          </button>
          {onClose ? (
            <button
              className="imageflow-layer-close"
              type="button"
              onClick={onClose}
              aria-label="Close layers panel"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 7l10 10M17 7L7 17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      <div className="imageflow-iteration-layers-list">
        {hasFolders
          ? layerFolders.map((folder) => {
              const isEditing = editingFolderId === folder.id;
              return (
                <div className="imageflow-layer-folder" key={folder.id}>
                  <div
                    className={`imageflow-layer-folder-row${
                      folder.collapsed ? " is-collapsed" : ""
                    }${folder.hidden ? " is-hidden" : ""}${
                      folder.locked ? " is-locked" : ""
                    }`}
                  >
                    <button
                      className="imageflow-layer-folder-toggle"
                      type="button"
                      onClick={() => onToggleFolderCollapse(folder.id)}
                      aria-label={
                        folder.collapsed ? "Expand folder" : "Collapse folder"
                      }
                      aria-expanded={!folder.collapsed}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M9 6l6 6-6 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    {isEditing ? (
                      <input
                        className="imageflow-layer-folder-input"
                        value={folderNameDraft}
                        autoFocus
                        onChange={(event) => setFolderNameDraft(event.target.value)}
                        onBlur={() => commitFolderName(folder)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            commitFolderName(folder);
                          }
                          if (event.key === "Escape") {
                            setEditingFolderId(null);
                          }
                        }}
                      />
                    ) : (
                      <button
                        className="imageflow-layer-folder-name"
                        type="button"
                        onDoubleClick={() => startEditingFolder(folder)}
                      >
                        <span className="imageflow-layer-label">
                          {folder.name}
                        </span>
                      </button>
                    )}
                    <span className="imageflow-layer-folder-count">
                      {folder.layers.length}
                    </span>
                    <div className="imageflow-layer-actions">
                      <button
                        className="imageflow-layer-action"
                        type="button"
                        onClick={() => onAddSelectionToFolder(folder.id)}
                        disabled={!selectedElementIds.length}
                        aria-label="Link selection to folder"
                        title="Link selection to folder"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M4 8h6l2 2h8v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h4l2 2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 13v4M10 15h4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <button
                        className="imageflow-layer-action"
                        type="button"
                        onClick={() => onToggleFolderVisibility(folder.id)}
                        aria-pressed={!folder.hidden}
                        aria-label={
                          folder.hidden ? "Show folder layers" : "Hide folder layers"
                        }
                        disabled={!folder.layers.length}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                        </svg>
                      </button>
                      <button
                        className="imageflow-layer-action"
                        type="button"
                        onClick={() => onToggleFolderLock(folder.id)}
                        aria-pressed={folder.locked}
                        aria-label={
                          folder.locked ? "Unlock folder layers" : "Lock folder layers"
                        }
                        disabled={!folder.layers.length}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect
                            x="6"
                            y="10"
                            width="12"
                            height="10"
                            rx="2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                          <path
                            d="M8 10V8a4 4 0 018 0v2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <button
                        className="imageflow-layer-action"
                        type="button"
                        onClick={() => onRemoveFolder(folder.id)}
                        aria-label="Ungroup folder"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M7 7l10 10M17 7L7 17"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {folder.collapsed ? null : (
                    <div className="imageflow-layer-folder-list">
                      {folder.layers.length ? (
                        folder.layers.map((entry) => renderLayerRow(entry, true))
                      ) : (
                        <div className="imageflow-layer-empty">
                          Folder is empty.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          : null}
        {hasUngrouped ? (
          <div className="imageflow-layer-section">
            {hasFolders ? (
              <div className="imageflow-layer-section-title">Ungrouped</div>
            ) : null}
            <div className="imageflow-layer-section-body">
              {ungroupedLayerEntries.map((entry) => renderLayerRow(entry))}
            </div>
          </div>
        ) : null}
        {!hasFolders && !hasUngrouped ? (
          <div className="imageflow-layer-empty">No layers detected.</div>
        ) : null}
      </div>
    </aside>
  );
}
