import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { useImageToSite } from "./../../_context/image-to-site-context";

export default function NodesView() {
  const { state, actions } = useImageToSite();
  const hasStructure = Boolean(state.structureFlow);

  return (
    <div className="imageflow-tree" aria-label="Site tree">
      <div className="imageflow-tree-toolbar">
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
          onNodesChange={actions.onNodesChange}
          onEdgesChange={actions.onEdgesChange}
          onNodeClick={actions.handleNodeClick}
          fitView
          minZoom={0.3}
          maxZoom={2.2}
        >
          <Background gap={20} size={1} color="rgba(15, 23, 42, 0.12)" />
          <Controls position="bottom-right" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
