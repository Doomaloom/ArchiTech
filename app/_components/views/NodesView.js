import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { useImageToSite } from "./../../_context/image-to-site-context";
import { useWorkflow } from "./../../_context/workflow-context";
import TranslateFlowNode from "./TranslateFlowNode";

const nodeTypes = {
  translateNode: TranslateFlowNode,
};

export default function NodesView() {
  const { state, actions, derived } = useImageToSite();
  const { workflowMode } = useWorkflow();
  const hasStructure = Boolean(state.structureFlow);
  const selectedNodeLabel = derived.selectedNodeLabel || "No node selected";
  const workflowClassName =
    workflowMode === "inspire" ? "is-inspire" : "is-translate";

  return (
    <div className={`imageflow-tree ${workflowClassName}`} aria-label="Site tree">
      <div className="imageflow-tree-toolbar">
        <span className="imageflow-tree-selected" title={selectedNodeLabel}>
          {selectedNodeLabel}
        </span>
        <label className="imageflow-tree-toggle">
          <input
            type="checkbox"
            checked={state.showComponents}
            onChange={(event) => actions.setShowComponents(event.target.checked)}
            disabled={!hasStructure}
          />
          <span>Show components</span>
        </label>
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={state.nodes}
          edges={state.edges}
          nodeTypes={nodeTypes}
          onNodeClick={actions.handleNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          fitView
          fitViewOptions={{ padding: 0.24, maxZoom: 1.2 }}
          minZoom={0.3}
          maxZoom={2.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="rgba(15, 23, 42, 0.12)" />
          <Controls position="bottom-right" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
