import { getLanguageBadge } from "../_lib/language";

export default function FileTree({
  nodes,
  groupLabel,
  collapsedFolders,
  onToggleFolder,
  activeCodeFileId,
  onOpenFile,
  depth = 0,
}) {
  return nodes.map((node) => {
    const isFile = Boolean(node.file);
    const folderKey = `${groupLabel}/${node.path}`;
    const isCollapsed = collapsedFolders[folderKey];
    const indentStyle = { "--indent": depth };

    if (isFile) {
      const badge = getLanguageBadge(node.file.language);
      return (
        <button
          key={node.path}
          type="button"
          className={`imageflow-file-button imageflow-file-node${
            node.file.id === activeCodeFileId ? " is-active" : ""
          }`}
          style={indentStyle}
          onClick={() => onOpenFile(node.file)}
        >
          <span className={`imageflow-file-icon ${badge.className}`}>
            {badge.label}
          </span>
          <span className="imageflow-file-name">{node.name}</span>
        </button>
      );
    }

    return (
      <div key={node.path} className="imageflow-file-folder">
        <button
          type="button"
          className="imageflow-file-group-toggle imageflow-file-node"
          style={indentStyle}
          onClick={() => onToggleFolder(folderKey)}
          aria-expanded={!isCollapsed}
        >
          <span
            className={`imageflow-file-chevron${
              isCollapsed ? " is-collapsed" : ""
            }`}
            aria-hidden="true"
          />
          <span className="imageflow-file-folder-name">{node.name}</span>
        </button>
        {isCollapsed ? null : (
          <FileTree
            nodes={node.children}
            groupLabel={groupLabel}
            collapsedFolders={collapsedFolders}
            onToggleFolder={onToggleFolder}
            activeCodeFileId={activeCodeFileId}
            onOpenFile={onOpenFile}
            depth={depth + 1}
          />
        )}
      </div>
    );
  });
}
