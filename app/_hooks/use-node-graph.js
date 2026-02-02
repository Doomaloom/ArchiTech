"use client";

import { useEffect, useState } from "react";
import { useEdgesState, useNodesState } from "reactflow";

import { DEMO_EDGES, DEMO_PAGES } from "../_lib/demo-data";

export default function useNodeGraph({ activeIndex } = {}) {
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
  const [edges, , onEdgesChange] = useEdgesState(DEMO_EDGES);

  useEffect(() => {
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
  }, [activeIndex, setNodes]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

  const selectedNodeLabel =
    DEMO_PAGES.find((page) => page.id === selectedNodeId)?.label ?? "Unknown";

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
