"use client";

import { useCallback } from "react";

const CHILD_KEYS = ["children", "items", "pages", "nodes"];

const resolveRoot = (structureFlow) => {
  if (!structureFlow || typeof structureFlow !== "object") {
    return null;
  }
  if (structureFlow.root && typeof structureFlow.root === "object") {
    return structureFlow.root;
  }
  return structureFlow;
};

const resolveChildrenKey = (node) => {
  const key = CHILD_KEYS.find((entry) => Array.isArray(node?.[entry]));
  return key || "children";
};

const collectNodeIds = (root) => {
  const ids = new Set();
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object") {
      continue;
    }
    const nodeId = current.id?.toString();
    if (nodeId) {
      ids.add(nodeId);
    }
    const children = current[resolveChildrenKey(current)] || [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }
  return ids;
};

const buildNextNodeId = (usedIds, parentId) => {
  const base = `${parentId || "node"}-child`;
  if (!usedIds.has(base)) {
    return base;
  }
  let counter = 2;
  let candidate = `${base}-${counter}`;
  while (usedIds.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
};

export default function useStructureTreeActions({
  structureFlow,
  setStructureFlow,
  setSelectedNodeId,
}) {
  const addNode = useCallback(
    (parentId) => {
      const root = resolveRoot(structureFlow);
      if (!root || !parentId) {
        return;
      }
      const usedIds = collectNodeIds(root);
      const nextId = buildNextNodeId(usedIds, parentId.toString());

      const appendChild = (node) => {
        if (!node || typeof node !== "object") {
          return node;
        }
        const nodeId = node.id?.toString();
        if (nodeId === parentId.toString()) {
          const key = resolveChildrenKey(node);
          const currentChildren = Array.isArray(node[key]) ? node[key] : [];
          const nextChild = {
            id: nextId,
            label: "New Node",
            description: "",
            requirements: [],
            kind: "page",
            children: [],
          };
          return { ...node, [key]: [...currentChildren, nextChild] };
        }
        const key = resolveChildrenKey(node);
        const children = Array.isArray(node[key]) ? node[key] : [];
        if (!children.length) {
          return node;
        }
        const nextChildren = children.map(appendChild);
        return { ...node, [key]: nextChildren };
      };

      const nextRoot = appendChild(root);
      setStructureFlow((current) =>
        current?.root && typeof current.root === "object"
          ? { ...current, root: nextRoot }
          : nextRoot
      );
      if (typeof setSelectedNodeId === "function") {
        setSelectedNodeId(nextId);
      }
      return nextId;
    },
    [setSelectedNodeId, setStructureFlow, structureFlow]
  );

  const deleteNode = useCallback(
    (nodeId) => {
      const root = resolveRoot(structureFlow);
      if (!root || !nodeId) {
        return;
      }
      const rootId = root.id?.toString();
      if (nodeId.toString() === rootId) {
        return;
      }

      let deleted = false;
      let fallbackSelected = null;

      const removeChild = (node) => {
        if (!node || typeof node !== "object") {
          return node;
        }
        const key = resolveChildrenKey(node);
        const children = Array.isArray(node[key]) ? node[key] : [];
        if (!children.length) {
          return node;
        }
        const filtered = children.filter((child) => {
          const matches = child?.id?.toString() === nodeId.toString();
          if (matches) {
            deleted = true;
            fallbackSelected = node.id?.toString() || null;
          }
          return !matches;
        });
        const nextChildren = filtered.map(removeChild);
        return { ...node, [key]: nextChildren };
      };

      const nextRoot = removeChild(root);
      if (!deleted) {
        return;
      }
      setStructureFlow((current) =>
        current?.root && typeof current.root === "object"
          ? { ...current, root: nextRoot }
          : nextRoot
      );
      if (typeof setSelectedNodeId === "function") {
        setSelectedNodeId(fallbackSelected);
      }
      return fallbackSelected;
    },
    [setSelectedNodeId, setStructureFlow, structureFlow]
  );

  const rerouteNode = useCallback(
    (nodeId, nextParentId) => {
      const root = resolveRoot(structureFlow);
      if (!root || !nodeId || !nextParentId) {
        return false;
      }
      const movingId = nodeId.toString();
      const targetParentId = nextParentId.toString();
      if (movingId === targetParentId) {
        return false;
      }

      let movingNode = null;

      const takeNode = (node) => {
        if (!node || typeof node !== "object") {
          return node;
        }
        const key = resolveChildrenKey(node);
        const children = Array.isArray(node[key]) ? node[key] : [];
        if (!children.length) {
          return node;
        }
        const keptChildren = [];
        for (const child of children) {
          if (child?.id?.toString() === movingId) {
            movingNode = child;
            continue;
          }
          keptChildren.push(takeNode(child));
        }
        return { ...node, [key]: keptChildren };
      };

      const rootWithoutNode = takeNode(root);
      if (!movingNode) {
        return false;
      }
      const invalidTarget = collectNodeIds(movingNode).has(targetParentId);
      if (invalidTarget) {
        return false;
      }

      const attachNode = (node) => {
        if (!node || typeof node !== "object") {
          return node;
        }
        if (node.id?.toString() === targetParentId) {
          const key = resolveChildrenKey(node);
          const children = Array.isArray(node[key]) ? node[key] : [];
          return { ...node, [key]: [...children, movingNode] };
        }
        const key = resolveChildrenKey(node);
        const children = Array.isArray(node[key]) ? node[key] : [];
        if (!children.length) {
          return node;
        }
        return {
          ...node,
          [key]: children.map(attachNode),
        };
      };

      const nextRoot = attachNode(rootWithoutNode);
      setStructureFlow((current) =>
        current?.root && typeof current.root === "object"
          ? { ...current, root: nextRoot }
          : nextRoot
      );
      if (typeof setSelectedNodeId === "function") {
        setSelectedNodeId(movingId);
      }
      return true;
    },
    [setSelectedNodeId, setStructureFlow, structureFlow]
  );

  return {
    addNode,
    deleteNode,
    rerouteNode,
  };
}
