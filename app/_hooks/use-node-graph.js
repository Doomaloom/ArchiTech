"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEdgesState, useNodesState } from "reactflow";

import { DEMO_EDGES, DEMO_PAGES } from "../_lib/demo-data";

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

const flattenStructure = (root) => {
  if (!root) {
    return [];
  }
  const result = [];
  const stack = [{ node: root, depth: 0, parentId: null }];
  while (stack.length) {
    const current = stack.pop();
    const node = current.node;
    if (!node || typeof node !== "object") {
      continue;
    }
    const id = node.id?.toString() || node.label?.toString() || "";
    if (!id) {
      continue;
    }
    result.push({
      id,
      label: node.label?.toString() || id,
      node,
      depth: current.depth,
      parentId: current.parentId,
    });
    const children = resolveChildren(node);
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = children[i];
      if (!child || typeof child !== "object") {
        continue;
      }
      stack.push({
        node: child,
        depth: current.depth + 1,
        parentId: id,
      });
    }
  }
  return result;
};

const buildFlow = ({ structureFlow, showComponents }) => {
  const root = resolveRoot(structureFlow);
  if (!root) {
    return null;
  }
  const flat = flattenStructure(root);
  if (!flat.length) {
    return null;
  }
  const includeDepth = showComponents ? Number.POSITIVE_INFINITY : 1;
  const included = flat.filter((item) => item.depth <= includeDepth);
  const levels = new Map();
  included.forEach((item) => {
    if (!levels.has(item.depth)) {
      levels.set(item.depth, []);
    }
    levels.get(item.depth).push(item);
  });
  const spacingX = showComponents ? 232 : 254;
  const spacingY = showComponents ? 112 : 126;
  const nodes = included.map((item) => {
    const column = levels.get(item.depth) || [];
    const rowIndex = column.findIndex((entry) => entry.id === item.id);
    const nodeKind = item.node?.kind?.toString() || (item.depth === 0 ? "root" : "page");
    const childCount = resolveChildren(item.node).length;
    return {
      id: item.id,
      position: { x: item.depth * spacingX, y: rowIndex * spacingY },
      data: {
        nodeId: item.id,
        parentId: item.parentId,
        label: item.label,
        kind: nodeKind,
        depth: item.depth,
        childCount,
      },
      className: "imageflow-tree-node",
      type: "translateNode",
    };
  });
  const edges = included
    .filter((item) => item.parentId && included.some((node) => node.id === item.parentId))
    .map((item) => ({
      id: `edge-${item.parentId}-${item.id}`,
      source: item.parentId,
      target: item.id,
    }));
  return { nodes, edges, included };
};

const setSelectionOnNodes = (currentNodes, selectedNodeId) => {
  if (!Array.isArray(currentNodes) || !currentNodes.length) {
    return currentNodes;
  }
  let changed = false;
  const nextNodes = currentNodes.map((node) => {
    const shouldBeSelected = node.id === selectedNodeId;
    if (Boolean(node.selected) === shouldBeSelected) {
      return node;
    }
    changed = true;
    return {
      ...node,
      selected: shouldBeSelected,
    };
  });
  return changed ? nextNodes : currentNodes;
};

export default function useNodeGraph({
  activeIndex,
  structureFlow,
  showComponents,
} = {}) {
  const [selectedNodeId, setSelectedNodeId] = useState(
    DEMO_PAGES[0]?.id ?? null
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(() =>
    DEMO_PAGES.map((page) => ({
      id: page.id,
      position: page.position,
      data: {
        nodeId: page.id,
        parentId: null,
        label: page.label,
        kind: "page",
        depth: Math.max(0, Math.round((page.position?.x || 0) / 260)),
        childCount: 0,
      },
      className: "imageflow-tree-node",
      type: "translateNode",
    }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEMO_EDGES);
  const handleNodesChange = useCallback(
    (changes) => {
      if (!Array.isArray(changes) || !changes.length) {
        return;
      }
      const filteredChanges = changes.filter((change) => change?.type !== "select");
      if (!filteredChanges.length) {
        return;
      }
      onNodesChange(filteredChanges);
    },
    [onNodesChange]
  );

  const flow = useMemo(
    () => buildFlow({ structureFlow, showComponents }),
    [showComponents, structureFlow]
  );

  useEffect(() => {
    if (!flow) {
      return;
    }
    setNodes(flow.nodes);
    setEdges(flow.edges);
    const firstId = flow.nodes[0]?.id ?? null;
    setSelectedNodeId((current) =>
      flow.nodes.some((node) => node.id === current) ? current : firstId
    );
  }, [flow, setEdges, setNodes]);

  useEffect(() => {
    if (flow) {
      return;
    }
    const selectedId = DEMO_PAGES[activeIndex % DEMO_PAGES.length]?.id ?? null;
    if (selectedId) {
      setSelectedNodeId(selectedId);
    }
    setNodes((current) => setSelectionOnNodes(current, selectedId));
  }, [activeIndex, flow, setNodes]);

  useEffect(() => {
    setNodes((current) => setSelectionOnNodes(current, selectedNodeId));
  }, [selectedNodeId, setNodes]);

  const selectedNodeLabel = useMemo(() => {
    if (flow) {
      return flow.included.find((item) => item.id === selectedNodeId)?.label ?? "Unknown";
    }
    return DEMO_PAGES.find((page) => page.id === selectedNodeId)?.label ?? "Unknown";
  }, [flow, selectedNodeId]);

  const handleNodeClick = (_, node) => {
    if (!node?.id) {
      return;
    }
    setSelectedNodeId(node.id);
  };

  return {
    state: {
      selectedNodeId,
      nodes,
      edges,
    },
    derived: {
      selectedNodeLabel,
    },
    actions: {
      onNodesChange: handleNodesChange,
      onEdgesChange,
      handleNodeClick,
      setSelectedNodeId,
    },
  };
}
