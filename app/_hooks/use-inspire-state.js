"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { DEFAULT_STRUCTURE_FLOW } from "../_lib/google-preview-defaults";

const DEFAULT_BRIEF = {
  title: "",
  name: "",
  details: "",
  audience: "",
  goals: "",
};

const clampNumber = (value, min, max) =>
  Math.min(Math.max(value, min), max);

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (entry == null ? "" : entry.toString()).trim())
      .filter(Boolean);
  }
  if (value == null) {
    return [];
  }
  const text = value.toString().trim();
  return text ? [text] : [];
};

const normalizeStyleIdea = (style, index) => {
  const palette = Array.isArray(style?.palette)
    ? style.palette.map((color) => color?.toString().trim()).filter(Boolean)
    : [];
  return {
    id: style?.id?.toString() || `style-${index + 1}`,
    title: style?.title?.toString() || `Style ${index + 1}`,
    summary: style?.summary?.toString() || "",
    palette,
    tags: normalizeList(style?.tags),
    components: normalizeList(style?.components),
    stylePrompt: style?.stylePrompt?.toString() || "",
  };
};

const normalizeTree = (input) => {
  if (!input || typeof input !== "object") {
    return null;
  }
  if (input.root && typeof input.root === "object") {
    return input.root;
  }
  if (input.tree && typeof input.tree === "object") {
    return input.tree;
  }
  return input;
};

const makeUniqueNodeId = (base, usedIds) => {
  const normalized = (base || "").toString().trim() || "node";
  if (!usedIds.has(normalized)) {
    usedIds.add(normalized);
    return normalized;
  }
  let counter = 2;
  let candidate = `${normalized}-${counter}`;
  while (usedIds.has(candidate)) {
    counter += 1;
    candidate = `${normalized}-${counter}`;
  }
  usedIds.add(candidate);
  return candidate;
};

const normalizeTreeIds = (root) => {
  if (!root || typeof root !== "object") {
    return root;
  }
  const usedIds = new Set();
  const walk = (node, depth = 0, siblingIndex = 0) => {
    if (!node || typeof node !== "object") {
      return node;
    }
    const next = { ...node };
    const baseId =
      next.id?.toString() ||
      next.label?.toString() ||
      `node-${depth + 1}-${siblingIndex + 1}`;
    next.id = makeUniqueNodeId(baseId, usedIds);
    next.label = next.label?.toString() || next.id;
    ["children", "items", "pages", "nodes"].forEach((key) => {
      if (Array.isArray(next[key])) {
        next[key] = next[key].map((child, index) =>
          walk(child, depth + 1, index)
        );
      }
    });
    return next;
  };
  return walk(root, 0, 0);
};

const cloneFallbackTree = () => {
  return JSON.parse(JSON.stringify(DEFAULT_STRUCTURE_FLOW));
};

const getTreeChildren = (node) => {
  if (!node || typeof node !== "object") {
    return [];
  }
  if (Array.isArray(node.children)) {
    return node.children;
  }
  if (Array.isArray(node.items)) {
    return node.items;
  }
  if (Array.isArray(node.pages)) {
    return node.pages;
  }
  if (Array.isArray(node.nodes)) {
    return node.nodes;
  }
  return [];
};

const toNodeSnapshot = (node) => {
  if (!node || typeof node !== "object") {
    return null;
  }
  return {
    id: node.id?.toString() || "",
    label: node.label?.toString() || "",
    description: node.description?.toString() || "",
    requirements: normalizeList(node.requirements),
    kind: node.kind?.toString() || "",
    imageDescriptions: normalizeList(
      node.imageDescriptions ?? node.imageDescription
    ),
    imageAnalysis: node.imageAnalysis ?? null,
  };
};

const buildNodeContextFromTree = (root, nodeId) => {
  if (!root || !nodeId) {
    return { node: null, parent: null, children: [], path: [] };
  }
  let found = null;
  let foundParent = null;
  let foundPath = [];

  const walk = (node, parent, path) => {
    if (!node) {
      return;
    }
    const nextPath = [...path, node];
    if (node.id?.toString() === nodeId?.toString()) {
      found = node;
      foundParent = parent;
      foundPath = nextPath;
      return;
    }
    const children = getTreeChildren(node);
    for (const child of children) {
      walk(child, node, nextPath);
      if (found) {
        return;
      }
    }
  };

  walk(root, null, []);
  if (!found) {
    return { node: null, parent: null, children: [], path: [] };
  }
  const children = getTreeChildren(found).map(toNodeSnapshot).filter(Boolean);
  return {
    node: toNodeSnapshot(found),
    parent: toNodeSnapshot(foundParent),
    children,
    path: foundPath.map(toNodeSnapshot).filter(Boolean),
  };
};

const flattenTree = (root) => {
  if (!root) {
    return [];
  }
  const nodes = [];
  const walk = (node, depth = 0, parentId = null) => {
    if (!node) {
      return;
    }
    nodes.push({
      id: node.id?.toString() || `node-${nodes.length + 1}`,
      label: node.label?.toString() || "Untitled",
      description: node.description?.toString() || "",
      requirements: normalizeList(node.requirements),
      kind: node.kind?.toString() || "",
      depth,
      parentId,
    });
    const children = getTreeChildren(node);
    children.forEach((child) => walk(child, depth + 1, node.id));
  };
  walk(root, 0, null);
  return nodes;
};

const normalizeTreePayload = (payload) => {
  const root = normalizeTree(payload);
  if (!root) {
    return null;
  }
  const rootWithIds = normalizeTreeIds(root);
  if (payload && typeof payload === "object") {
    if (payload.root && typeof payload.root === "object") {
      return { ...payload, root: rootWithIds };
    }
    if (payload.tree && typeof payload.tree === "object") {
      return { ...payload, tree: rootWithIds };
    }
  }
  return rootWithIds;
};

const createOfflineTree = () => normalizeTreeIds(cloneFallbackTree());

const resolveDefaultSelectedNodeId = (root) => {
  if (!root || typeof root !== "object") {
    return null;
  }
  const firstChild = getTreeChildren(root)[0];
  return firstChild?.id?.toString() || root.id?.toString() || null;
};

export default function useInspireState() {
  const initialOfflineTreeRef = useRef(createOfflineTree());
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [styleIdeas, setStyleIdeas] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isGeneratingStyles, setIsGeneratingStyles] = useState(false);
  const [styleError, setStyleError] = useState("");
  const [tree, setTree] = useState(() => initialOfflineTreeRef.current);
  const [isGeneratingTree, setIsGeneratingTree] = useState(false);
  const [hasRequestedTree, setHasRequestedTree] = useState(false);
  const [treeError, setTreeError] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState(() =>
    resolveDefaultSelectedNodeId(initialOfflineTreeRef.current)
  );
  const [previewItems, setPreviewItems] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [isApplyingMaskEdit, setIsApplyingMaskEdit] = useState(false);
  const [isFinalizingPreview, setIsFinalizingPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState("image");
  const [previewCount, setPreviewCount] = useState(3);
  const [modelQuality, setModelQuality] = useState("flash");
  const [creativityValue, setCreativityValue] = useState(40);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [workspaceNote, setWorkspaceNote] = useState("");
  const [workspaceMask, setWorkspaceMask] = useState(null);

  const treeRoot = useMemo(() => normalizeTree(tree), [tree]);
  const treeNodes = useMemo(() => flattenTree(treeRoot), [treeRoot]);
  const selectedNode = useMemo(
    () => treeNodes.find((node) => node.id === selectedNodeId) || null,
    [treeNodes, selectedNodeId]
  );
  const selectedPreview = previewItems[selectedPreviewIndex] || null;

  const handleSetSelectedNodeId = useCallback((nodeId) => {
    setSelectedNodeId(nodeId == null ? null : nodeId.toString());
  }, []);

  const updateBrief = useCallback((field, value) => {
    setBrief((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const handleSelectStyle = useCallback((style) => {
    if (!style) {
      return;
    }
    const offlineTree = createOfflineTree();
    setSelectedStyle(style);
    setTree(offlineTree);
    handleSetSelectedNodeId(resolveDefaultSelectedNodeId(offlineTree));
    setHasRequestedTree(false);
    setPreviewItems([]);
    setPreviewError("");
    setWorkspaceMask(null);
  }, [handleSetSelectedNodeId]);

  const loadStyleIdeas = useCallback(async () => {
    if (isGeneratingStyles) {
      return;
    }
    setStyleError("");
    setIsGeneratingStyles(true);
    try {
      const response = await fetch("/api/inspire/styles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ brief }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to generate styles.");
      }
      const ideas = Array.isArray(payload?.styles) ? payload.styles : [];
      const normalized = ideas.map(normalizeStyleIdea);
      setStyleIdeas(normalized);
      if (!selectedStyle && normalized.length) {
        setSelectedStyle(normalized[0]);
      }
    } catch (error) {
      setStyleError(error?.message ?? "Failed to generate styles.");
    } finally {
      setIsGeneratingStyles(false);
    }
  }, [brief, isGeneratingStyles, selectedStyle]);

  const generateTree = useCallback(async () => {
    if (isGeneratingTree) {
      return;
    }
    setTreeError("");
    if (!selectedStyle) {
      setTreeError("Select a style before generating the tree.");
      return;
    }
    setHasRequestedTree(true);
    setIsGeneratingTree(true);
    try {
      const response = await fetch("/api/structure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: brief.title,
          name: brief.name,
          details: brief.details,
          audience: brief.audience,
          goals: brief.goals,
          style: selectedStyle,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to generate tree.");
      }
      const modelTree =
        payload?.tree ?? payload?.structure ?? payload?.root ?? payload;
      const normalizedTree = normalizeTreePayload(modelTree);
      const root = normalizeTree(normalizedTree);
      if (!root) {
        throw new Error("Model tree response was empty or invalid.");
      }
      setTree(normalizedTree);
      setPreviewItems([]);
      setPreviewError("");
      const defaultNodeId = resolveDefaultSelectedNodeId(root);
      if (defaultNodeId) {
        handleSetSelectedNodeId(defaultNodeId);
      }
    } catch (error) {
      const fallbackRoot = createOfflineTree();
      setTree(fallbackRoot);
      setPreviewItems([]);
      setPreviewError("");
      handleSetSelectedNodeId(resolveDefaultSelectedNodeId(fallbackRoot));
      const reason = error?.message ?? "AI structure generation unavailable.";
      setTreeError(`Loaded fallback Google structure. ${reason}`);
    } finally {
      setIsGeneratingTree(false);
    }
  }, [brief, handleSetSelectedNodeId, isGeneratingTree, selectedStyle]);

  const generatePreviews = useCallback(async ({ nodeId } = {}) => {
    if (isGeneratingPreviews) {
      return;
    }
    setPreviewError("");
    const activeNodeId = nodeId?.toString() || selectedNodeId;
    if (!treeRoot || !activeNodeId) {
      setPreviewError("Generate a tree and select a node first.");
      return;
    }
    const nodeContext = buildNodeContextFromTree(treeRoot, activeNodeId);
    if (!nodeContext?.node) {
      setPreviewError("Selected node not found.");
      return;
    }

    const count =
      previewMode === "image"
        ? 6
        : clampNumber(Number(previewCount) || 1, 1, 6);
    setIsGeneratingPreviews(true);
    setSelectedPreviewIndex(0);
    setPreviewItems(
      Array.from({ length: count }, (_, index) => ({
        id: `preview-${index + 1}`,
        status: "loading",
        imageUrl: null,
        html: null,
        plan: null,
        renderError: null,
      }))
    );

    try {
      const response = await fetch("/api/inspire/previews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count,
          quality: modelQuality,
          creativity: creativityValue,
          previewMode,
          nodeContext,
          brief,
          style: selectedStyle,
          workspace: {
            note: workspaceNote,
            mask: workspaceMask,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok && !payload?.previews) {
        throw new Error(payload?.error || "Failed to generate previews.");
      }
      if (!response.ok) {
        setPreviewError(payload?.error || payload?.message || "");
      }
      const previews = Array.isArray(payload?.previews) ? payload.previews : [];
      setPreviewItems(
        Array.from({ length: count }, (_, index) => {
          const preview = previews[index];
          if (!preview) {
            return {
              id: `preview-${index + 1}`,
              status: "empty",
              imageUrl: null,
              html: null,
              plan: null,
              renderError: null,
            };
          }
          return {
            ...preview,
            status: preview.imageUrl || preview.html ? "ready" : "empty",
            html: preview.html ?? null,
            renderError: preview.renderError ?? null,
          };
        })
      );
    } catch (error) {
      setPreviewError(error?.message ?? "Failed to generate previews.");
      setPreviewItems([]);
    } finally {
      setIsGeneratingPreviews(false);
    }
  }, [
    brief,
    creativityValue,
    isGeneratingPreviews,
    modelQuality,
    previewMode,
    previewCount,
    selectedNodeId,
    selectedStyle,
    treeRoot,
    workspaceMask,
    workspaceNote,
  ]);

  const applyMaskEdit = useCallback(async () => {
    if (isApplyingMaskEdit) {
      return;
    }
    setPreviewError("");
    if (previewMode === "html") {
      setPreviewError("Mask edit is available only for image previews.");
      return;
    }
    if (!selectedPreview?.imageUrl) {
      setPreviewError("Select a preview image first.");
      return;
    }
    if (!workspaceMask?.dataUrl) {
      setPreviewError("Draw a mask before applying edits.");
      return;
    }

    const nodeContext = buildNodeContextFromTree(treeRoot, selectedNodeId);
    setIsApplyingMaskEdit(true);
    try {
      const response = await fetch("/api/inspire/edits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageDataUrl: selectedPreview.imageUrl,
          maskDataUrl: workspaceMask.dataUrl,
          prompt: workspaceNote,
          plan: selectedPreview.plan,
          brief,
          style: selectedStyle,
          nodeContext: nodeContext?.node ? nodeContext : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to apply mask edit.");
      }
      if (!payload?.imageUrl) {
        throw new Error("Edited image was not returned.");
      }

      setPreviewItems((current) =>
        current.map((preview, index) =>
          index === selectedPreviewIndex
            ? {
                ...preview,
                imageUrl: payload.imageUrl,
                html: null,
                status: "ready",
                renderError: null,
              }
            : preview
        )
      );
    } catch (error) {
      setPreviewError(error?.message ?? "Failed to apply mask edit.");
    } finally {
      setIsApplyingMaskEdit(false);
    }
  }, [
    brief,
    isApplyingMaskEdit,
    previewMode,
    selectedNodeId,
    selectedPreview,
    selectedPreviewIndex,
    selectedStyle,
    treeRoot,
    workspaceMask,
    workspaceNote,
  ]);

  const finalizeToHtml = useCallback(async () => {
    if (isFinalizingPreview) {
      return;
    }
    setPreviewError("");
    if (previewMode === "html") {
      return;
    }
    if (!selectedPreview?.imageUrl) {
      setPreviewError("Select a preview image first.");
      return;
    }

    const nodeContext = buildNodeContextFromTree(treeRoot, selectedNodeId);
    setIsFinalizingPreview(true);
    try {
      const response = await fetch("/api/inspire/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageDataUrl: selectedPreview.imageUrl,
          quality: modelQuality,
          plan: selectedPreview.plan,
          brief,
          style: selectedStyle,
          nodeContext: nodeContext?.node ? nodeContext : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to finalize preview.");
      }
      if (!payload?.html) {
        throw new Error("Finalize response did not include HTML.");
      }

      setPreviewItems((current) =>
        current.map((preview, index) =>
          index === selectedPreviewIndex
            ? {
                ...preview,
                html: payload.html,
                status: "ready",
                renderError: null,
              }
            : preview
        )
      );
    } catch (error) {
      setPreviewError(error?.message ?? "Failed to finalize preview.");
    } finally {
      setIsFinalizingPreview(false);
    }
  }, [
    brief,
    isFinalizingPreview,
    modelQuality,
    previewMode,
    selectedNodeId,
    selectedPreview,
    selectedPreviewIndex,
    selectedStyle,
    treeRoot,
  ]);

  const hydrateWorkspace = useCallback((snapshot = {}) => {
    if (!snapshot || typeof snapshot !== "object") {
      return;
    }

    const nextBrief = snapshot.brief && typeof snapshot.brief === "object"
      ? snapshot.brief
      : DEFAULT_BRIEF;
    setBrief({
      title: nextBrief.title?.toString() || "",
      name: nextBrief.name?.toString() || "",
      details: nextBrief.details?.toString() || "",
      audience: nextBrief.audience?.toString() || "",
      goals: nextBrief.goals?.toString() || "",
    });

    const nextIdeas = Array.isArray(snapshot.styleIdeas)
      ? snapshot.styleIdeas.map(normalizeStyleIdea)
      : [];
    setStyleIdeas(nextIdeas);

    const selectedFromSnapshot = snapshot.selectedStyle
      ? normalizeStyleIdea(snapshot.selectedStyle, 0)
      : null;
    if (selectedFromSnapshot) {
      setSelectedStyle(selectedFromSnapshot);
    } else if (nextIdeas.length) {
      setSelectedStyle(nextIdeas[0]);
    } else {
      setSelectedStyle(null);
    }

    const hydratedTree = normalizeTreePayload(snapshot.tree) || createOfflineTree();
    const hydratedRoot = normalizeTree(hydratedTree);
    const fallbackNodeId = resolveDefaultSelectedNodeId(hydratedRoot);
    const snapshotNodeId = snapshot.selectedNodeId?.toString() || null;
    const hasSnapshotNode =
      snapshotNodeId &&
      hydratedRoot &&
      Boolean(buildNodeContextFromTree(hydratedRoot, snapshotNodeId)?.node);
    setTree(hydratedTree);
    setSelectedNodeId(hasSnapshotNode ? snapshotNodeId : fallbackNodeId);
    setHasRequestedTree(false);

    const nextPreviewCount = clampNumber(Number(snapshot.previewCount) || 3, 1, 6);
    setPreviewCount(nextPreviewCount);
    const nextPreviewItems = Array.isArray(snapshot.previewItems)
      ? snapshot.previewItems.slice(0, nextPreviewCount)
      : [];
    setPreviewItems(nextPreviewItems);
    setSelectedPreviewIndex(
      clampNumber(
        Number(snapshot.selectedPreviewIndex) || 0,
        0,
        Math.max(nextPreviewItems.length - 1, 0)
      )
    );

    setPreviewMode(snapshot.previewMode === "html" ? "html" : "image");
    setModelQuality(snapshot.modelQuality === "pro" ? "pro" : "flash");
    setCreativityValue(
      clampNumber(Number(snapshot.creativityValue) || 45, 0, 100)
    );
    setWorkspaceNote(snapshot.workspaceNote?.toString() || "");
    setWorkspaceMask(
      snapshot.workspaceMask && typeof snapshot.workspaceMask === "object"
        ? snapshot.workspaceMask
        : null
    );

    setPreviewError("");
    setStyleError("");
    setTreeError("");
    setIsGeneratingStyles(false);
    setIsGeneratingTree(false);
    setIsGeneratingPreviews(false);
    setIsApplyingMaskEdit(false);
    setIsFinalizingPreview(false);
  }, []);

  const actions = useMemo(
    () => ({
      updateBrief,
      loadStyleIdeas,
      selectStyle: handleSelectStyle,
      generateTree,
      generatePreviews,
      applyMaskEdit,
      finalizeToHtml,
      setSelectedNodeId: handleSetSelectedNodeId,
      setPreviewCount,
      setModelQuality,
      setCreativityValue,
      setPreviewMode,
      setSelectedPreviewIndex,
      setWorkspaceNote,
      setWorkspaceMask,
      setSelectedStyle,
      hydrateWorkspace,
    }),
    [
      applyMaskEdit,
      finalizeToHtml,
      generatePreviews,
      generateTree,
      handleSetSelectedNodeId,
      handleSelectStyle,
      loadStyleIdeas,
      setCreativityValue,
      setModelQuality,
      setPreviewCount,
      setPreviewMode,
      setSelectedPreviewIndex,
      setSelectedStyle,
      setWorkspaceMask,
      setWorkspaceNote,
      hydrateWorkspace,
      updateBrief,
    ]
  );

  return {
    state: {
      brief,
      styleIdeas,
      selectedStyle,
      isGeneratingStyles,
      styleError,
      tree,
      isGeneratingTree,
      hasRequestedTree,
      treeError,
      selectedNodeId,
      previewItems,
      previewError,
      isGeneratingPreviews,
      isApplyingMaskEdit,
      isFinalizingPreview,
      previewMode,
      previewCount,
      modelQuality,
      creativityValue,
      selectedPreviewIndex,
      workspaceNote,
      workspaceMask,
    },
    derived: {
      treeRoot,
      treeNodes,
      selectedNode,
      selectedPreview,
    },
    actions,
  };
}
