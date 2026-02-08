import { Handle, Position } from "reactflow";
import { useImageToSite } from "./../../_context/image-to-site-context";

const toKindLabel = (kind) => {
  const normalized = kind?.toString().trim().toLowerCase() || "node";
  if (normalized === "root") {
    return "Root";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export default function TranslateFlowNode({ data, selected }) {
  const { actions } = useImageToSite();
  const nodeId = data?.nodeId?.toString() || "";
  const label = data?.label?.toString() || "Untitled";
  const kind = toKindLabel(data?.kind);
  const depth = Number.isFinite(data?.depth) ? data.depth : 0;
  const childCount = Number.isFinite(data?.childCount) ? data.childCount : 0;
  const isRoot = depth === 0 || kind.toLowerCase() === "root";
  const topologyLabel =
    childCount > 0
      ? `${childCount} child${childCount === 1 ? "" : "ren"}`
      : "Leaf";

  const handleAddNode = (event) => {
    event.stopPropagation();
    if (!nodeId) {
      return;
    }
    actions.addStructureNode?.(nodeId);
  };

  const handleDeleteNode = (event) => {
    event.stopPropagation();
    if (!nodeId || isRoot) {
      return;
    }
    actions.deleteStructureNode?.(nodeId);
  };

  const handleRerouteNode = (event) => {
    event.stopPropagation();
    if (!nodeId || isRoot || typeof window === "undefined") {
      return;
    }
    const nextParentId = window.prompt("Move node under parent id:", "");
    if (!nextParentId) {
      return;
    }
    const moved = actions.rerouteStructureNode?.(nodeId, nextParentId.trim());
    if (!moved) {
      window.alert("Unable to reroute node. Check parent id and avoid cycles.");
    }
  };

  return (
    <div className={`translate-flow-node${selected ? " is-selected" : ""}`}>
      <Handle type="target" position={Position.Left} className="translate-flow-node-handle" />
      <div className="translate-flow-node-header">
        <span className="translate-flow-node-kind">{kind}</span>
        <span className="translate-flow-node-meta">{topologyLabel}</span>
      </div>
      <p className="translate-flow-node-label">{label}</p>
      <div className="translate-flow-node-actions">
        <button type="button" onClick={handleAddNode}>
          Add
        </button>
        <button type="button" onClick={handleRerouteNode} disabled={isRoot}>
          Reroute
        </button>
        <button type="button" onClick={handleDeleteNode} disabled={isRoot}>
          Delete
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="translate-flow-node-handle" />
    </div>
  );
}
