"use client";

import { useEffect, useMemo, useState } from "react";
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
  const spacingX = 260;
  const spacingY = 140;
  const nodes = included.map((item) => {
    const column = levels.get(item.depth) || [];
    const rowIndex = column.findIndex((entry) => entry.id === item.id);
    return {
      id: item.id,
      position: { x: item.depth * spacingX, y: rowIndex * spacingY },
      data: { label: item.label },
      type: "default",
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

export default function useNodeGraph({ activeIndex, structureFlow, showComponents } = {}) {
  const [selectedNodeId, setSelectedNodeId] = useState(
    DEMO_PAGES[0]?.id ?? null
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(() =>
    DEMO_PAGES.map((page) => ({
      id: page.id,
      position: page.position,
      data: { label: page.label },
      type: "default",
    }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEMO_EDGES);

  const flow = useMemo(
    () => buildFlow({ structureFlow, showComponents }),
    [structureFlow, showComponents]
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
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedId,
      }))
    );
  }, [activeIndex, flow, setNodes]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }))
    );
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
      onNodesChange,
      onEdgesChange,
      handleNodeClick,
    },
  };
}
