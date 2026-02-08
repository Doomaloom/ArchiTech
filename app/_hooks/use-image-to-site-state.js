"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useAgentChat from "./use-agent-chat";
import useCodeWorkspace from "./use-code-workspace";
import useDetails from "./use-details";
import useGallery from "./use-gallery";
import useIterationState from "./image-to-site/use-iteration-state";
import useNodeGraph from "./use-node-graph";
import usePreviewSettings from "./use-preview-settings";
import useStructureTreeActions from "./use-structure-tree-actions";
import useViewMode from "./use-view-mode";
import {
  DEFAULT_PREVIEW_ITEMS,
  DEFAULT_STRUCTURE_FLOW,
} from "./../_lib/google-preview-defaults";

const PREVIEW_ZOOM_MIN = 0.6;
const PREVIEW_ZOOM_MAX = 1;
const PREVIEW_ZOOM_STEP = 0.1;
const VALID_VIEW_MODES = new Set([
  "start",
  "nodes",
  "preview",
  "selected",
  "iterate",
  "builder",
  "code",
]);

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

const resolveChildren = (node) =>
  node?.children || node?.items || node?.pages || node?.nodes || [];

const resolveStructureRoot = (structureFlow) => {
  if (!structureFlow) {
    return null;
  }
  if (structureFlow.root && typeof structureFlow.root === "object") {
    return structureFlow.root;
  }
  return structureFlow;
};

const buildStructureIndex = (root) => {
  if (!root) {
    return null;
  }
  const nodesById = {};
  const parentById = {};
  const stack = [{ node: root, parentId: null }];
  while (stack.length) {
    const current = stack.pop();
    const node = current.node;
    if (!node || typeof node !== "object") {
      continue;
    }
    const id = node.id?.toString();
    if (!id) {
      continue;
    }
    nodesById[id] = node;
    if (current.parentId) {
      parentById[id] = current.parentId;
    }
    const children = resolveChildren(node);
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = children[i];
      if (!child || typeof child !== "object") {
        continue;
      }
      const childId = child.id?.toString();
      if (!childId) {
        continue;
      }
      stack.push({ node: child, parentId: id });
    }
  }
  return { nodesById, parentById };
};

const buildNodeContext = ({ nodesById, parentById, selectedNodeId }) => {
  if (!nodesById || !selectedNodeId) {
    return null;
  }
  const node = nodesById[selectedNodeId];
  if (!node) {
    return null;
  }
  const parentId = parentById[selectedNodeId] ?? null;
  const parent = parentId ? nodesById[parentId] : null;
  const children = resolveChildren(node);
  const path = [];
  let cursorId = selectedNodeId;
  while (cursorId) {
    const current = nodesById[cursorId];
    if (!current) {
      break;
    }
    path.push({
      id: current.id,
      label: current.label ?? current.id,
    });
    cursorId = parentById[cursorId];
  }
  path.reverse();
  return { node, parent, children, path };
};

const normalizePreviewItems = (items, count) => {
  const safeItems = Array.isArray(items) ? items : [];
  const next = safeItems.slice(0, count);
  while (next.length < count) {
    next.push({});
  }
  return next;
};

export default function useImageToSiteState() {
  const viewMode = useViewMode();
  const previewSettings = usePreviewSettings({
    setViewMode: viewMode.setViewMode,
    currentViewMode: viewMode.viewMode,
  });
  const initialPreviewItems = normalizePreviewItems(
    DEFAULT_PREVIEW_ITEMS,
    previewSettings.state.previewCount
  );
  const [previewItems, setPreviewItems] = useState(() => initialPreviewItems);
  const [builderHtml, setBuilderHtml] = useState(
    () => initialPreviewItems[previewSettings.state.selectedPreviewIndex]?.html || ""
  );
  const [previewZoom, setPreviewZoom] = useState(PREVIEW_ZOOM_MAX);
  const [previewError, setPreviewError] = useState("");
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [modelQuality, setModelQuality] = useState("flash");
  const [creativityValue, setCreativityValue] = useState(40);
  const [structureFlow, setStructureFlow] = useState(
    () => DEFAULT_STRUCTURE_FLOW
  );
  const [showComponents, setShowComponents] = useState(false);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const structureTreeActions = useStructureTreeActions({
    structureFlow,
    setStructureFlow,
  });

  const codeWorkspace = useCodeWorkspace();
  const agentChat = useAgentChat();
  const gallery = useGallery({
    onFilesIngested: codeWorkspace.actions.addCustomFiles,
  });
  const details = useDetails();
  const nodeGraph = useNodeGraph({
    activeIndex: gallery.state.activeIndex,
    structureFlow,
    showComponents,
  });

  const handleAddStructureNode = useCallback(
    (parentId) => {
      const nextId = structureTreeActions.addNode(parentId);
      if (nextId) {
        nodeGraph.actions.setSelectedNodeId(nextId);
      }
    },
    [nodeGraph.actions, structureTreeActions]
  );

  const handleDeleteStructureNode = useCallback(
    (nodeId) => {
      const fallbackId = structureTreeActions.deleteNode(nodeId);
      if (fallbackId) {
        nodeGraph.actions.setSelectedNodeId(fallbackId);
      }
    },
    [nodeGraph.actions, structureTreeActions]
  );

  const handleRerouteStructureNode = useCallback(
    (nodeId, nextParentId) => {
      const moved = structureTreeActions.rerouteNode(nodeId, nextParentId);
      if (moved) {
        nodeGraph.actions.setSelectedNodeId(nodeId?.toString() || null);
      }
      return moved;
    },
    [nodeGraph.actions, structureTreeActions]
  );
  const iteration = useIterationState({
    isIterationMode: viewMode.isIterationMode,
    selectedPreviewIndex: previewSettings.state.selectedPreviewIndex,
  });

  useEffect(() => {
    setPreviewItems((current) => {
      if (current.length === previewSettings.state.previewCount) {
        return current;
      }
      if (current.length > previewSettings.state.previewCount) {
        return current.slice(0, previewSettings.state.previewCount);
      }
      const next = current.slice();
      while (next.length < previewSettings.state.previewCount) {
        next.push({});
      }
      return next;
    });
    if (
      previewSettings.state.selectedPreviewIndex >=
      previewSettings.state.previewCount
    ) {
      previewSettings.actions.setSelectedPreviewIndex(
        Math.max(previewSettings.state.previewCount - 1, 0)
      );
    }
  }, [
    previewSettings.state.previewCount,
    previewSettings.state.selectedPreviewIndex,
    previewSettings.actions,
  ]);

  const structureRoot = useMemo(
    () => resolveStructureRoot(structureFlow),
    [structureFlow]
  );
  const structureIndex = useMemo(
    () => buildStructureIndex(structureRoot),
    [structureRoot]
  );
  const selectedNodeContext = useMemo(
    () =>
      buildNodeContext({
        nodesById: structureIndex?.nodesById ?? null,
        parentById: structureIndex?.parentById ?? null,
        selectedNodeId: nodeGraph.state.selectedNodeId,
      }),
    [nodeGraph.state.selectedNodeId, structureIndex]
  );

  const handlePreviewZoomOut = useCallback(() => {
    setPreviewZoom((current) =>
      clampValue(current - PREVIEW_ZOOM_STEP, PREVIEW_ZOOM_MIN, PREVIEW_ZOOM_MAX)
    );
  }, []);

  const handlePreviewZoomReset = useCallback(() => {
    setPreviewZoom(PREVIEW_ZOOM_MAX);
  }, []);

  const handleGenerateStructure = useCallback(async () => {
    const primaryImage = gallery.derived.activeImageFile;
    if (!primaryImage) {
      setGenerationError("Upload an image before generating structure.");
      return;
    }
    setIsGeneratingStructure(true);
    setGenerationError("");
    try {
      const formData = new FormData();
      formData.append("image", primaryImage);
      gallery.state.imageFiles.forEach((file) => {
        formData.append("images", file);
      });
      formData.append("title", details.state.title);
      formData.append("name", details.state.name);
      formData.append("details", details.state.details);
      const response = await fetch("/api/structure", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setGenerationError(
          payload?.error || payload?.message || "Failed to generate structure."
        );
        return;
      }
      setStructureFlow(payload?.tree ?? null);
      viewMode.setViewMode("nodes");
    } catch (error) {
      setGenerationError(error?.message ?? "Failed to generate structure.");
    } finally {
      setIsGeneratingStructure(false);
    }
  }, [
    details.state.details,
    details.state.name,
    details.state.title,
    gallery.derived.activeImageFile,
    gallery.state.imageFiles,
    viewMode,
  ]);

  const handleGeneratePreviews = useCallback(async () => {
    if (!selectedNodeContext?.node) {
      setPreviewError("Select a node before generating previews.");
      return;
    }
    setIsGeneratingPreviews(true);
    setPreviewError("");
    try {
      const response = await fetch("/api/previews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count: previewSettings.state.previewCount,
          quality: modelQuality,
          creativity: creativityValue,
          renderMode: "html",
          nodeContext: selectedNodeContext,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPreviewError(
          payload?.error || payload?.message || "Failed to generate previews."
        );
        const fallback = normalizePreviewItems(
          payload?.previews ?? [],
          previewSettings.state.previewCount
        );
        setPreviewItems(fallback);
        return;
      }
      const normalized = normalizePreviewItems(
        payload?.previews ?? [],
        previewSettings.state.previewCount
      );
      setPreviewItems(normalized);
      previewSettings.actions.setSelectedPreviewIndex(0);
      const generatedHtml =
        normalized.find((preview) => preview?.html)?.html || "";
      setBuilderHtml(generatedHtml);
      viewMode.setViewMode("preview");
    } catch (error) {
      setPreviewError(error?.message ?? "Failed to generate previews.");
    } finally {
      setIsGeneratingPreviews(false);
    }
  }, [
    creativityValue,
    modelQuality,
    previewSettings.actions,
    previewSettings.state.previewCount,
    selectedNodeContext,
    viewMode,
  ]);

  const hydratePreviews = useCallback(
    ({ previews, selectedIndex = 0 } = {}) => {
      const safePreviews = Array.isArray(previews) ? previews : [];
      const nextCount = Math.max(safePreviews.length, 1);
      const clampedSelectedIndex = clampValue(
        Number.isFinite(selectedIndex) ? Math.trunc(selectedIndex) : 0,
        0,
        Math.max(nextCount - 1, 0)
      );
      const normalized = normalizePreviewItems(safePreviews, nextCount);
      const selectedPreview = normalized[clampedSelectedIndex];
      previewSettings.actions.setPreviewCount(nextCount);
      previewSettings.actions.setSelectedPreviewIndex(clampedSelectedIndex);
      setPreviewItems(normalized);
      setBuilderHtml(selectedPreview?.html || "");
      setPreviewError("");
      viewMode.setViewMode("iterate");
    },
    [previewSettings.actions, viewMode]
  );

  const hydrateWorkspace = useCallback(
    (snapshot = {}) => {
      if (!snapshot || typeof snapshot !== "object") {
        return;
      }

      const nextPreviewCount = clampValue(
        Number(snapshot.previewCount) || 3,
        1,
        6
      );
      const normalized = normalizePreviewItems(
        snapshot.previewItems,
        nextPreviewCount
      );
      const nextSelectedPreviewIndex = clampValue(
        Number(snapshot.selectedPreviewIndex) || 0,
        0,
        Math.max(nextPreviewCount - 1, 0)
      );
      const viewModeFromSnapshot = snapshot.viewMode?.toString();
      const nextViewMode = VALID_VIEW_MODES.has(viewModeFromSnapshot)
        ? viewModeFromSnapshot
        : "start";

      details.actions.setTitle(snapshot.title?.toString() || "");
      details.actions.setName(snapshot.name?.toString() || "");
      details.actions.setDetails(snapshot.details?.toString() || "");
      setStructureFlow(snapshot.structureFlow ?? DEFAULT_STRUCTURE_FLOW);
      setShowComponents(Boolean(snapshot.showComponents));
      setModelQuality(snapshot.modelQuality === "pro" ? "pro" : "flash");
      setCreativityValue(
        clampValue(Number(snapshot.creativityValue) || 40, 0, 100)
      );
      previewSettings.actions.setPreviewCount(nextPreviewCount);
      previewSettings.actions.setSelectedPreviewIndex(nextSelectedPreviewIndex);
      setPreviewItems(normalized);
      setBuilderHtml(
        snapshot.builderHtml?.toString() ||
          normalized[nextSelectedPreviewIndex]?.html ||
          ""
      );
      setPreviewError("");
      setGenerationError("");
      viewMode.setViewMode(nextViewMode);
    },
    [details.actions, previewSettings.actions, viewMode]
  );

  const previewZoomLabel = useMemo(
    () => `${Math.round(previewZoom * 100)}%`,
    [previewZoom]
  );
  const canPreviewZoomOut = previewZoom > PREVIEW_ZOOM_MIN + 0.001;
  const canPreviewZoomReset = previewZoom !== PREVIEW_ZOOM_MAX;
  const qualityLabel = modelQuality === "pro" ? "Pro" : "Flash";
  const qualityIndex = modelQuality === "pro" ? 1 : 0;

  useEffect(() => {
    const selectedPreview =
      previewItems[previewSettings.state.selectedPreviewIndex];
    if (!selectedPreview?.html) {
      return;
    }
    setBuilderHtml(selectedPreview.html);
  }, [previewItems, previewSettings.state.selectedPreviewIndex]);

  return {
    state: {
      fileMeta: gallery.state.fileMeta,
      isDragging: gallery.state.isDragging,
      gallery: gallery.state.gallery,
      activeIndex: gallery.state.activeIndex,
      previewItems,
      builderHtml,
      viewMode: viewMode.viewMode,
      previewCount: previewSettings.state.previewCount,
      selectedPreviewIndex: previewSettings.state.selectedPreviewIndex,
      speedValue: previewSettings.state.speedValue,
      previewZoom,
      previewError,
      isGeneratingPreviews,
      modelQuality,
      creativityValue,
      structureFlow,
      showComponents,
      isGeneratingStructure,
      generationError,
      title: details.state.title,
      name: details.state.name,
      details: details.state.details,
      customFiles: codeWorkspace.state.customFiles,
      activeCodeFileId: codeWorkspace.state.activeCodeFileId,
      openCodeTabs: codeWorkspace.state.openCodeTabs,
      codePanelMode: codeWorkspace.state.codePanelMode,
      collapsedFolders: codeWorkspace.state.collapsedFolders,
      codeContents: codeWorkspace.state.codeContents,
      agentInput: agentChat.state.agentInput,
      agentMessages: agentChat.state.agentMessages,
      iterationTool: iteration.state.iterationTool,
      showTransformControls: iteration.state.showTransformControls,
      showLayers: iteration.state.showLayers,
      showHistory: iteration.state.showHistory,
      showTextPanel: iteration.state.showTextPanel,
      showGrid: iteration.state.showGrid,
      snapToGrid: iteration.state.snapToGrid,
      showGuides: iteration.state.showGuides,
      snapToGuides: iteration.state.snapToGuides,
      gridSize: iteration.state.gridSize,
      guides: iteration.state.guides,
      isDrawing: iteration.state.isDrawing,
      draftCircle: iteration.state.draftCircle,
      pendingAnnotation: iteration.state.pendingAnnotation,
      noteDraft: iteration.state.noteDraft,
      annotations: iteration.state.annotations,
      iterationSize: iteration.state.iterationSize,
      siteBounds: iteration.state.siteBounds,
      selectedElementId: iteration.state.selectedElementId,
      selectedElementIds: iteration.state.selectedElementIds,
      elementTransforms: iteration.state.elementTransforms,
      scaleLock: iteration.state.scaleLock,
      zoomLevel: iteration.state.zoomLevel,
      panOffset: iteration.state.panOffset,
      isSpacePanning: iteration.state.isSpacePanning,
      isPanning: iteration.state.isPanning,
      textEdits: iteration.state.textEdits,
      textEditDraft: iteration.state.textEditDraft,
      layerState: iteration.state.layerState,
      layerFolders: iteration.state.layerFolders,
      layerFolderOrder: iteration.state.layerFolderOrder,
      deletedLayerIds: iteration.state.deletedLayerIds,
      highlightedIds: iteration.state.highlightedIds,
      baseLayout: iteration.state.baseLayout,
      showPatch: iteration.state.showPatch,
      pencilPoints: iteration.state.pencilPoints,
      isPencilDrawing: iteration.state.isPencilDrawing,
      selectedNodeId: nodeGraph.state.selectedNodeId,
      nodes: nodeGraph.state.nodes,
      edges: nodeGraph.state.edges,
    },
    derived: {
      hasFile: gallery.derived.hasFile,
      dropTitle: gallery.derived.dropTitle,
      dropMeta: gallery.derived.dropMeta,
      fileSizeLabel: gallery.derived.fileSizeLabel,
      activePreview: gallery.derived.activePreview,
      previewZoomLabel,
      canPreviewZoomOut,
      canPreviewZoomReset,
      qualityLabel,
      qualityIndex,
      codeFileGroups: codeWorkspace.derived.codeFileGroups,
      codeTreeGroups: codeWorkspace.derived.codeTreeGroups,
      activeCodeFile: codeWorkspace.derived.activeCodeFile,
      activeCodeLanguage: codeWorkspace.derived.activeCodeLanguage,
      activeCodeContent: codeWorkspace.derived.activeCodeContent,
      isPreviewMode: viewMode.isPreviewMode,
      isIterationMode: viewMode.isIterationMode,
      selectedNodeLabel: nodeGraph.derived.selectedNodeLabel,
      qualityValue: previewSettings.derived.qualityValue,
      overlayMode: iteration.derived.overlayMode,
      isOverlayTool: iteration.derived.isOverlayTool,
      isTextTool: iteration.derived.isTextTool,
      isZoomTool: iteration.derived.isZoomTool,
      zoomLevel: iteration.derived.zoomLevel,
      panOffset: iteration.derived.panOffset,
      isPanMode: iteration.derived.isPanMode,
      isPanning: iteration.derived.isPanning,
      canTransform: iteration.derived.canTransform,
      canBoxSelect: iteration.derived.canBoxSelect,
      stageSize: iteration.derived.stageSize,
      notePosition: iteration.derived.notePosition,
      moveTargets: iteration.derived.moveTargets,
      nestedSelectionIds: iteration.derived.nestedSelectionIds,
      hasNestedSelection: iteration.derived.hasNestedSelection,
      primaryMoveTargetId: iteration.derived.primaryMoveTargetId,
      layerEntries: iteration.derived.layerEntries,
      layerFolderEntries: iteration.derived.layerFolderEntries,
      ungroupedLayerEntries: iteration.derived.ungroupedLayerEntries,
      iterationPatch: iteration.derived.iterationPatch,
      verticalGuides: iteration.derived.verticalGuides,
      horizontalGuides: iteration.derived.horizontalGuides,
      historyEntries: iteration.derived.historyEntries,
      activeHistoryId: iteration.derived.activeHistoryId,
      canUndo: iteration.derived.canUndo,
      canRedo: iteration.derived.canRedo,
      alignmentScopeLabel: iteration.derived.alignmentScopeLabel,
      canAlign: iteration.derived.canAlign,
    },
    refs: iteration.refs,
    actions: {
      setActiveIndex: gallery.actions.setActiveIndex,
      setPreviewCount: previewSettings.actions.setPreviewCount,
      setSpeedValue: previewSettings.actions.setSpeedValue,
      setPreviewZoom,
      setModelQuality,
      setCreativityValue,
      setStructureFlow,
      setShowComponents,
      setTitle: details.actions.setTitle,
      setName: details.actions.setName,
      setDetails: details.actions.setDetails,
      setViewMode: viewMode.setViewMode,
      setSelectedPreviewIndex: previewSettings.actions.setSelectedPreviewIndex,
      setCodePanelMode: codeWorkspace.actions.setCodePanelMode,
      setAgentInput: agentChat.actions.setAgentInput,
      setBuilderHtml,
      setIterationTool: iteration.actions.setIterationTool,
      setShowTransformControls: iteration.actions.setShowTransformControls,
      setShowLayers: iteration.actions.setShowLayers,
      setShowHistory: iteration.actions.setShowHistory,
      setShowTextPanel: iteration.actions.setShowTextPanel,
      setShowGrid: iteration.actions.setShowGrid,
      setSnapToGrid: iteration.actions.setSnapToGrid,
      setShowGuides: iteration.actions.setShowGuides,
      setSnapToGuides: iteration.actions.setSnapToGuides,
      setGridSize: iteration.actions.setGridSize,
      setShowPatch: iteration.actions.setShowPatch,
      setNoteDraft: iteration.actions.setNoteDraft,
      setSelectedElementId: iteration.actions.setSelectedElementId,
      setSelectedElementIds: iteration.actions.setSelectedElementIds,
      onNodesChange: nodeGraph.actions.onNodesChange,
      onEdgesChange: nodeGraph.actions.onEdgesChange,
      handleFileChange: gallery.actions.handleFileChange,
      handleDragOver: gallery.actions.handleDragOver,
      handleDragLeave: gallery.actions.handleDragLeave,
      handleDrop: gallery.actions.handleDrop,
      handlePrevImage: gallery.actions.handlePrevImage,
      handleNextImage: gallery.actions.handleNextImage,
      handleDeleteImage: gallery.actions.handleDeleteImage,
      handleSelectPreview: previewSettings.actions.handleSelectPreview,
      handleIteratePreview: previewSettings.actions.handleIteratePreview,
      handlePreviewZoomOut,
      handlePreviewZoomReset,
      handleGeneratePreviews,
      handleGenerateStructure,
      hydratePreviews,
      hydrateWorkspace,
      handleNodeClick: nodeGraph.actions.handleNodeClick,
      setSelectedNodeId: nodeGraph.actions.setSelectedNodeId,
      addStructureNode: handleAddStructureNode,
      deleteStructureNode: handleDeleteStructureNode,
      rerouteStructureNode: handleRerouteStructureNode,
      handleOpenCodeFile: codeWorkspace.actions.handleOpenCodeFile,
      handleEditorChange: codeWorkspace.actions.handleEditorChange,
      handleToggleFolder: codeWorkspace.actions.handleToggleFolder,
      handleAgentSend: agentChat.actions.handleAgentSend,
      handleZoomPointer: iteration.actions.handleZoomPointer,
      handleZoomWheel: iteration.actions.handleZoomWheel,
      handlePanPointerDown: iteration.actions.handlePanPointerDown,
      handlePanPointerMove: iteration.actions.handlePanPointerMove,
      handlePanPointerEnd: iteration.actions.handlePanPointerEnd,
      handleCreateGuide: iteration.actions.handleCreateGuide,
      handleAddGuide: iteration.actions.handleAddGuide,
      handleUpdateGuide: iteration.actions.handleUpdateGuide,
      handleRemoveGuide: iteration.actions.handleRemoveGuide,
      handleClearGuides: iteration.actions.handleClearGuides,
      handleTextContentChange: iteration.actions.handleTextContentChange,
      handleTextStyleChange: iteration.actions.handleTextStyleChange,
      handleResetTextEdit: iteration.actions.handleResetTextEdit,
      applyTextStyles: iteration.actions.applyTextStyles,
      handleOverlayPointerDown: iteration.actions.handleOverlayPointerDown,
      handleOverlayPointerMove: iteration.actions.handleOverlayPointerMove,
      handleOverlayPointerEnd: iteration.actions.handleOverlayPointerEnd,
      handleSaveNote: iteration.actions.handleSaveNote,
      handleCancelNote: iteration.actions.handleCancelNote,
      handleSelectElement: iteration.actions.handleSelectElement,
      handleToggleHighlight: iteration.actions.handleToggleHighlight,
      updateElementTransform: iteration.actions.updateElementTransform,
      setScaleLock: iteration.actions.setScaleLock,
      toggleScaleLock: iteration.actions.toggleScaleLock,
      handleScaleStart: iteration.actions.handleScaleStart,
      handleScaleEnd: iteration.actions.handleScaleEnd,
      handleTransformStart: iteration.actions.handleTransformStart,
      handleTransformEnd: iteration.actions.handleTransformEnd,
      handleSelectoEnd: iteration.actions.handleSelectoEnd,
      handleDeleteSelection: iteration.actions.handleDeleteSelection,
      handleUndoHistory: iteration.actions.handleUndoHistory,
      handleRedoHistory: iteration.actions.handleRedoHistory,
      handleClearHistory: iteration.actions.handleClearHistory,
      handleAlignElements: iteration.actions.handleAlignElements,
      handleToggleLayerVisibility: iteration.actions.handleToggleLayerVisibility,
      handleToggleLayerLock: iteration.actions.handleToggleLayerLock,
      handleCreateLayerFolder: iteration.actions.handleCreateLayerFolder,
      handleRenameLayerFolder: iteration.actions.handleRenameLayerFolder,
      handleRemoveLayerFolder: iteration.actions.handleRemoveLayerFolder,
      handleToggleLayerFolderCollapsed:
        iteration.actions.handleToggleLayerFolderCollapsed,
      handleAddSelectionToFolder: iteration.actions.handleAddSelectionToFolder,
      handleUnlinkSelection: iteration.actions.handleUnlinkSelection,
      handleToggleLayerFolderVisibility:
        iteration.actions.handleToggleLayerFolderVisibility,
      handleToggleLayerFolderLock: iteration.actions.handleToggleLayerFolderLock,
      getTransformState: iteration.actions.getTransformState,
      getTransformControlState: iteration.actions.getTransformControlState,
    },
  };
}
