"use client";

import { useMemo, useRef, useState } from "react";

import { getNotePosition, getTopLevelSelection } from "./iteration/geometry";
import { useIterationHistory } from "./iteration/history";
import { buildIterationPatch } from "./iteration/patch";
import { buildContainerLayout, resolveContainedParentId } from "./iteration/containerUtils";
import useIterationContainers from "./iteration/useIterationContainers";
import useIterationAnnotations from "./iteration/useIterationAnnotations";
import useIterationGuides from "./iteration/useIterationGuides";
import useIterationDetachedLayers from "./iteration/useIterationDetachedLayers";
import useIterationLayerEffects from "./iteration/useIterationLayerEffects";
import useIterationLayersState from "./iteration/useIterationLayersState";
import useIterationLayout from "./iteration/useIterationLayout";
import useIterationNestedChildSizes from "./iteration/useIterationNestedChildSizes";
import useIterationNestedSizing from "./iteration/useIterationNestedSizing";
import useIterationPanels from "./iteration/useIterationPanels";
import useIterationSelection from "./iteration/useIterationSelection";
import useIterationSelectionHotkeys from "./iteration/useIterationSelectionHotkeys";
import useIterationSizeEffects from "./iteration/useIterationSizeEffects";
import useIterationTextEdits from "./iteration/useIterationTextEdits";
import useIterationTools from "./iteration/useIterationTools";
import useIterationTransforms from "./iteration/useIterationTransforms";
import useIterationViewport from "./iteration/useIterationViewport";
import useIterationZoomHotkeys from "./iteration/useIterationZoomHotkeys";

export default function useIterationState({ isIterationMode, selectedPreviewIndex }) {
  const iterationRef = useRef(null);
  const iterationPreviewRef = useRef(null);
  const iterationSiteRef = useRef(null);
  const [isTransforming, setIsTransforming] = useState(false);

  const historyRef = useRef(() => {});
  const scheduleHistoryCommit = (label) => historyRef.current(label);
  const selectionApiRef = useRef({
    removeSelectionIds: () => {},
    getSelectedIds: () => [],
  });
  const textEditsApiRef = useRef({
    removeTextEditsForIds: () => {},
  });

  const tools = useIterationTools();
  const panels = useIterationPanels({ isIterationMode });
  const layout = useIterationLayout({
    isIterationMode,
    iterationPreviewRef,
    iterationSiteRef,
  });

  const stageSize = useMemo(() => {
    if (layout.state.iterationSize.width && layout.state.iterationSize.height) {
      return layout.state.iterationSize;
    }
    return layout.state.siteBounds;
  }, [layout.state.iterationSize, layout.state.siteBounds]);

  const viewport = useIterationViewport({
    isIterationMode,
    isZoomTool: tools.derived.isZoomTool,
    isPanTool: tools.derived.isPanTool,
    iterationPreviewRef,
  });

  const guides = useIterationGuides({
    stageSize,
    setShowGuides: panels.actions.setShowGuides,
  });

  const layers = useIterationLayersState({
    isIterationMode,
    baseLayout: layout.state.baseLayout,
    scheduleHistoryCommit,
    selectionApiRef,
  });

  const transforms = useIterationTransforms({
    isIterationMode,
    iterationSiteRef,
    scheduleHistoryCommit,
  });

  const detachment = useIterationDetachedLayers({
    isIterationMode,
    iterationSiteRef,
    baseLayout: layout.state.baseLayout,
    layerParentMap: layers.derived.layerParentMap,
    hasFolderState:
      layers.state.layerFolderOrder.length > 0 ||
      Object.keys(layers.state.layerFolders).length > 0,
    elementTransforms: transforms.state.elementTransforms,
    setElementTransforms: transforms.actions.setElementTransforms,
    zoomLevel: viewport.derived.zoomLevel,
  });

  const containers = useIterationContainers({
    isIterationMode,
    iterationSiteRef,
    layerParentMap: layers.derived.layerParentMap,
    detachedLayerIds: detachment.derived.detachedLayerIds,
    baseLayout: layout.state.baseLayout,
  });

  const containerLayout = useMemo(
    () =>
      buildContainerLayout({
        baseLayout: layout.state.baseLayout,
        containerMap: containers.derived.containerGraph.map,
        detachedIds: detachment.derived.detachedLayerIds,
      }),
    [
      containers.derived.containerGraph.map,
      detachment.derived.detachedLayerIds,
      layout.state.baseLayout,
    ]
  );

  const selection = useIterationSelection({
    isIterationMode,
    selectionMode: tools.derived.selectionMode,
    isSpacePanning: viewport.state.isSpacePanning,
    isPanning: viewport.state.isPanning,
    scheduleHistoryCommit,
    layers,
    transforms,
    textEditsApiRef,
  });

  selectionApiRef.current = {
    removeSelectionIds: selection.actions.removeSelectionIds,
    getSelectedIds: selection.actions.getSelectedIds,
    getPrimaryId: selection.actions.getPrimaryId,
  };

  const nestedChildSizes = useIterationNestedChildSizes({
    isIterationMode,
    baseLayout: layout.state.baseLayout,
    containerChildIds: containers.derived.containerGraph.childIds,
  });

  const nestedSizing = useIterationNestedSizing({
    isIterationMode,
    iterationSiteRef,
    baseLayout: layout.state.baseLayout,
    elementTransforms: transforms.state.elementTransforms,
    containerParentMap: containers.derived.containerGraph.map,
    setElementTransforms: transforms.actions.setElementTransforms,
    zoomLevel: viewport.derived.zoomLevel,
    isTransforming,
    selectedElementIds: selection.state.selectedElementIds,
  });

  const domSizeOverrides = useMemo(() => {
    const nestedSizes = nestedChildSizes.state.nestedChildSizes;
    const parentSizes = nestedSizing.state.elementSizes;
    const detachedSizes = detachment.state.detachedSizes;
    if (
      !Object.keys(nestedSizes).length &&
      !Object.keys(parentSizes).length &&
      !Object.keys(detachedSizes).length
    ) {
      return {};
    }
    const merged = { ...nestedSizes };
    Object.entries(parentSizes).forEach(([id, size]) => {
      merged[id] = { ...merged[id], ...size };
    });
    Object.entries(detachedSizes).forEach(([id, size]) => {
      merged[id] = { ...merged[id], ...size };
    });
    return merged;
  }, [
    detachment.state.detachedSizes,
    nestedChildSizes.state.nestedChildSizes,
    nestedSizing.state.elementSizes,
  ]);

  useIterationSizeEffects({
    isIterationMode,
    iterationSiteRef,
    elementSizes: domSizeOverrides,
  });

  useIterationSelectionHotkeys({
    isIterationMode,
    selectedElementIds: selection.state.selectedElementIds,
    handleDeleteSelection: selection.actions.handleDeleteSelection,
    handleNudgeSelection: selection.actions.handleNudgeSelection,
  });

  useIterationZoomHotkeys({
    isIterationMode,
    applyZoom: viewport.actions.applyZoom,
    getPreviewCenter: viewport.actions.getPreviewCenter,
  });

  const textEdits = useIterationTextEdits({
    isIterationMode,
    iterationTool: tools.state.iterationTool,
    selectedElementId: selection.state.selectedElementId,
    iterationSiteRef,
    scheduleHistoryCommit,
  });

  textEditsApiRef.current = {
    removeTextEditsForIds: textEdits.actions.removeTextEditsForIds,
  };

  const annotations = useIterationAnnotations({
    isIterationMode,
    iterationTool: tools.state.iterationTool,
    overlayMode: tools.derived.overlayMode,
    iterationPreviewRef,
    panOffset: viewport.derived.panOffset,
    zoomLevel: viewport.derived.zoomLevel,
    baseLayout: layout.state.baseLayout,
    elementTransforms: transforms.state.elementTransforms,
    isLayerHidden: layers.helpers.isLayerHidden,
    isLayerDeleted: layers.helpers.isLayerDeleted,
    updateSelectedElements: selection.actions.updateSelectedElements,
    scheduleHistoryCommit,
  });

  useIterationLayerEffects({
    isIterationMode,
    iterationSiteRef,
    selectedElementIds: selection.state.selectedElementIds,
    highlightedIds: layers.state.highlightedIds,
    layerState: layers.state.layerState,
    deletedLayerIds: layers.state.deletedLayerIds,
    isLayerDeleted: layers.helpers.isLayerDeleted,
    parentLayerIds: containers.derived.containerGraph.parentIds,
  });

  const historySnapshot = {
    elementTransforms: transforms.state.elementTransforms,
    textEdits: textEdits.state.textEdits,
    annotations: annotations.state.annotations,
    layerState: layers.state.layerState,
    layerFolders: layers.state.layerFolders,
    layerFolderOrder: layers.state.layerFolderOrder,
    deletedLayerIds: layers.state.deletedLayerIds,
    highlightedIds: layers.state.highlightedIds,
  };

  const applyHistorySnapshot = (snapshot) => {
    transforms.actions.setElementTransforms(snapshot?.elementTransforms ?? {});
    textEdits.actions.setTextEdits(snapshot?.textEdits ?? {});
    annotations.actions.setAnnotations(snapshot?.annotations ?? []);
    layers.actions.setLayerState(snapshot?.layerState ?? {});
    layers.actions.setLayerFolders(snapshot?.layerFolders ?? {});
    layers.actions.setLayerFolderOrder(snapshot?.layerFolderOrder ?? []);
    layers.actions.setDeletedLayerIds(snapshot?.deletedLayerIds ?? []);
    layers.actions.setHighlightedIds(snapshot?.highlightedIds ?? []);
    selection.actions.updateSelectedElements([]);
  };

  const history = useIterationHistory({
    isIterationMode,
    baseLayout: layout.state.baseLayout,
    snapshot: historySnapshot,
    applySnapshot: applyHistorySnapshot,
  });

  historyRef.current = history.actions.scheduleHistoryCommit;

  const notePosition = useMemo(
    () =>
      getNotePosition({
        pendingAnnotation: annotations.state.pendingAnnotation,
        stageSize,
        zoomLevel: viewport.derived.zoomLevel,
        panOffset: viewport.derived.panOffset,
      }),
    [
      annotations.state.pendingAnnotation,
      stageSize,
      viewport.derived.panOffset,
      viewport.derived.zoomLevel,
    ]
  );

  const moveTargetIds = useMemo(() => {
    return getTopLevelSelection(
      selection.state.selectedElementIds,
      containerLayout
    );
  }, [containerLayout, selection.state.selectedElementIds]);

  const nestedSelectionIds = useMemo(() => {
    if (!selection.state.selectedElementIds.length) {
      return [];
    }
    if (!containers.derived.containerGraph.childIds.length) {
      return [];
    }
    const nestedSet = new Set(containers.derived.containerGraph.childIds);
    return selection.state.selectedElementIds.filter((id) => nestedSet.has(id));
  }, [
    containers.derived.containerGraph.childIds,
    selection.state.selectedElementIds,
  ]);

  const getSelectionContainerParent = () =>
    resolveContainedParentId(
      iterationSiteRef.current,
      selection.state.selectedElementIds
    );

  const handleUnlinkSelection = () => {
    if (!nestedSelectionIds.length) {
      return;
    }
    const parentIds = Array.from(
      new Set(
        nestedSelectionIds
          .map((id) => containers.derived.containerGraph.map[id])
          .filter(Boolean)
      )
    );
    layers.actions.unlinkLayersFromFolders(nestedSelectionIds);
    nestedSizing.actions.clearElementSizes(parentIds);
  };

  const moveTargets = useMemo(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return [];
    }
    return moveTargetIds
      .map((id) =>
        iterationSiteRef.current.querySelector(`[data-gem-id="${id}"]`)
      )
      .filter(Boolean)
      .filter((element) => {
        const id = element.dataset?.gemId;
        if (!id) {
          return false;
        }
        if (
          layers.helpers.isLayerHidden(id) ||
          layers.helpers.isLayerLocked(id) ||
          layers.helpers.isLayerDeleted(id)
        ) {
          return false;
        }
        return true;
      });
  }, [
    isIterationMode,
    layout.state.iterationSize,
    layers.helpers,
    moveTargetIds,
  ]);

  const iterationPatch = useMemo(
    () =>
      buildIterationPatch({
        isIterationMode,
        baseLayout: containerLayout,
        elementTransforms: transforms.state.elementTransforms,
        elementSizes: domSizeOverrides,
        layerState: layers.state.layerState,
        layerFolders: layers.state.layerFolders,
        layerFolderOrder: layers.state.layerFolderOrder,
        deletedLayerIds: layers.state.deletedLayerIds,
        highlightedIds: layers.state.highlightedIds,
        selectedElementIds: selection.state.selectedElementIds,
        selectedPreviewIndex,
        siteBounds: layout.state.siteBounds,
        iterationTool: tools.state.iterationTool,
        annotations: annotations.state.annotations,
        textEdits: textEdits.state.textEdits,
      }),
    [
      annotations.state.annotations,
      isIterationMode,
      containerLayout,
      domSizeOverrides,
      layers.state.deletedLayerIds,
      layers.state.highlightedIds,
      layers.state.layerFolderOrder,
      layers.state.layerFolders,
      layers.state.layerState,
      selection.state.selectedElementIds,
      selectedPreviewIndex,
      layout.state.siteBounds,
      textEdits.state.textEdits,
      tools.state.iterationTool,
      transforms.state.elementTransforms,
    ]
  );

  const canTransform = isIterationMode && Boolean(tools.derived.activeTool?.transform);
  const canBoxSelect = isIterationMode && tools.derived.selectionMode === "box";

  return {
    state: {
      iterationTool: tools.state.iterationTool,
      showTransformControls: panels.state.showTransformControls,
      showLayers: panels.state.showLayers,
      showHistory: panels.state.showHistory,
      showTextPanel: panels.state.showTextPanel,
      showGrid: panels.state.showGrid,
      snapToGrid: panels.state.snapToGrid,
      showGuides: panels.state.showGuides,
      snapToGuides: panels.state.snapToGuides,
      gridSize: panels.state.gridSize,
      guides: guides.state.guides,
      isDrawing: annotations.state.isDrawing,
      draftCircle: annotations.state.draftCircle,
      pendingAnnotation: annotations.state.pendingAnnotation,
      noteDraft: annotations.state.noteDraft,
      annotations: annotations.state.annotations,
      iterationSize: layout.state.iterationSize,
      siteBounds: layout.state.siteBounds,
      selectedElementId: selection.state.selectedElementId,
      selectedElementIds: selection.state.selectedElementIds,
      elementTransforms: transforms.state.elementTransforms,
      zoomLevel: viewport.derived.zoomLevel,
      panOffset: viewport.derived.panOffset,
      isSpacePanning: viewport.state.isSpacePanning,
      isPanning: viewport.state.isPanning,
      textEdits: textEdits.state.textEdits,
      textEditDraft: textEdits.state.textEditDraft,
      layerState: layers.state.layerState,
      layerFolders: layers.state.layerFolders,
      layerFolderOrder: layers.state.layerFolderOrder,
      deletedLayerIds: layers.state.deletedLayerIds,
      highlightedIds: layers.state.highlightedIds,
      baseLayout: layout.state.baseLayout,
      showPatch: panels.state.showPatch,
      pencilPoints: annotations.state.pencilPoints,
      isPencilDrawing: annotations.state.isPencilDrawing,
    },
    derived: {
      overlayMode: tools.derived.overlayMode,
      isOverlayTool: tools.derived.isOverlayTool,
      isTextTool: tools.derived.isTextTool,
      isZoomTool: tools.derived.isZoomTool,
      zoomLevel: viewport.derived.zoomLevel,
      panOffset: viewport.derived.panOffset,
      isPanMode: viewport.derived.isPanMode,
      isPanning: viewport.state.isPanning,
      canTransform,
      canBoxSelect,
      stageSize,
      notePosition,
      moveTargets,
      nestedSelectionIds,
      layerEntries: layers.derived.layerEntries,
      layerFolderEntries: layers.derived.layerFolderEntries,
      ungroupedLayerEntries: layers.derived.ungroupedLayerEntries,
      iterationPatch,
      verticalGuides: guides.derived.verticalGuides,
      horizontalGuides: guides.derived.horizontalGuides,
      historyEntries: history.derived.historyEntries,
      activeHistoryId: history.derived.activeHistoryId,
      canUndo: history.derived.canUndo,
      canRedo: history.derived.canRedo,
      hasNestedSelection: nestedSelectionIds.length > 0,
    },
    refs: {
      iterationRef,
      iterationPreviewRef,
      iterationSiteRef,
    },
    actions: {
      setIterationTool: tools.actions.setIterationTool,
      setShowTransformControls: panels.actions.setShowTransformControls,
      setShowLayers: panels.actions.setShowLayers,
      setShowHistory: panels.actions.setShowHistory,
      setShowTextPanel: panels.actions.setShowTextPanel,
      setShowGrid: panels.actions.setShowGrid,
      setSnapToGrid: panels.actions.setSnapToGrid,
      setShowGuides: panels.actions.setShowGuides,
      setSnapToGuides: panels.actions.setSnapToGuides,
      setGridSize: panels.actions.setGridSize,
      setShowPatch: panels.actions.setShowPatch,
      setNoteDraft: annotations.actions.setNoteDraft,
      setSelectedElementId: selection.actions.setSelectedElementId,
      setSelectedElementIds: selection.actions.setSelectedElementIds,
      handleZoomPointer: viewport.actions.handleZoomPointer,
      handleZoomWheel: viewport.actions.handleZoomWheel,
      handlePanPointerDown: viewport.actions.handlePanPointerDown,
      handlePanPointerMove: viewport.actions.handlePanPointerMove,
      handlePanPointerEnd: viewport.actions.handlePanPointerEnd,
      handleCreateGuide: guides.actions.handleCreateGuide,
      handleAddGuide: guides.actions.handleAddGuide,
      handleUpdateGuide: guides.actions.handleUpdateGuide,
      handleRemoveGuide: guides.actions.handleRemoveGuide,
      handleClearGuides: guides.actions.handleClearGuides,
      handleTextContentChange: textEdits.actions.handleTextContentChange,
      handleTextStyleChange: textEdits.actions.handleTextStyleChange,
      handleResetTextEdit: textEdits.actions.handleResetTextEdit,
      handleOverlayPointerDown: annotations.actions.handleOverlayPointerDown,
      handleOverlayPointerMove: annotations.actions.handleOverlayPointerMove,
      handleOverlayPointerEnd: annotations.actions.handleOverlayPointerEnd,
      handleSaveNote: annotations.actions.handleSaveNote,
      handleCancelNote: annotations.actions.handleCancelNote,
      handleSelectElement: selection.actions.handleSelectElement,
      handleToggleHighlight: selection.actions.handleToggleHighlight,
      updateElementTransform: transforms.actions.updateElementTransform,
      handleTransformStart: () => setIsTransforming(true),
      handleTransformEnd: () => setIsTransforming(false),
      handleSelectoEnd: selection.actions.handleSelectoEnd,
      handleDeleteSelection: selection.actions.handleDeleteSelection,
      handleUndoHistory: history.actions.handleUndoHistory,
      handleRedoHistory: history.actions.handleRedoHistory,
      handleClearHistory: history.actions.handleClearHistory,
      handleToggleLayerVisibility: layers.actions.handleToggleLayerVisibility,
      handleToggleLayerLock: layers.actions.handleToggleLayerLock,
      handleCreateLayerFolder: () =>
        layers.actions.handleCreateLayerFolder({
          parentId: getSelectionContainerParent(),
        }),
      handleRenameLayerFolder: layers.actions.handleRenameLayerFolder,
      handleRemoveLayerFolder: layers.actions.handleRemoveLayerFolder,
      handleToggleLayerFolderCollapsed:
        layers.actions.handleToggleLayerFolderCollapsed,
      handleAddSelectionToFolder: (folderId) =>
        layers.actions.handleAddSelectionToFolder(folderId, {
          parentId: getSelectionContainerParent(),
        }),
      handleUnlinkSelection,
      handleToggleLayerFolderVisibility:
        layers.actions.handleToggleLayerFolderVisibility,
      handleToggleLayerFolderLock: layers.actions.handleToggleLayerFolderLock,
      getTransformState: transforms.helpers.getTransformState,
    },
  };
}
