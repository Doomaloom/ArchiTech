import { useEffect, useState } from "react";

import { ITERATION_SELECTION_TOOLS } from "../../../_lib/iteration-tools";
import { normalizeTransform } from "./constants";

export default function useIterationSelection({
  isIterationMode,
  selectionMode,
  isSpacePanning,
  isPanning,
  scheduleHistoryCommit,
  layers,
  transforms,
  textEditsApiRef,
}) {
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [selectedElementIds, setSelectedElementIds] = useState(() => []);

  const updateSelectedElements = (ids) => {
    const nextIds = (ids ?? []).filter((id) => !layers.helpers.isLayerDeleted(id));
    setSelectedElementIds(nextIds);
    setSelectedElementId(nextIds[0] ?? null);
  };

  const removeSelectionIds = (idsToRemove) => {
    if (!idsToRemove?.length) {
      return;
    }
    setSelectedElementIds((current) => {
      const next = current.filter((id) => !idsToRemove.includes(id));
      setSelectedElementId(next[0] ?? null);
      return next;
    });
  };

  const getSelectedIds = () => selectedElementIds;
  const getPrimaryId = () => selectedElementId;

  useEffect(() => {
    if (!selectedElementIds.length) {
      if (selectedElementId) {
        setSelectedElementId(null);
      }
      return;
    }
    if (!selectedElementIds.includes(selectedElementId)) {
      setSelectedElementId(selectedElementIds[0]);
    }
  }, [selectedElementId, selectedElementIds]);

  const handleSelectElement = (event) => {
    if (!isIterationMode) {
      return;
    }
    if (isSpacePanning || isPanning) {
      return;
    }
    if (!ITERATION_SELECTION_TOOLS.includes(selectionMode)) {
      return;
    }
    if (selectionMode !== "box") {
      return;
    }
    const target = event.target?.closest?.("[data-gem-id]");
    if (!target) {
      if (!event.shiftKey) {
        updateSelectedElements([]);
      }
      return;
    }
    const id = target.dataset?.gemId;
    if (!id || layers.helpers.isLayerHidden(id) || layers.helpers.isLayerDeleted(id)) {
      return;
    }
    if (event.shiftKey) {
      setSelectedElementIds((current) => {
        const exists = current.includes(id);
        const next = exists
          ? current.filter((entry) => entry !== id)
          : [...current, id];
        setSelectedElementId(next[0] ?? null);
        return next;
      });
      return;
    }
    updateSelectedElements([id]);
  };

  const handleSelectoEnd = (event) => {
    if (isSpacePanning || isPanning) {
      return;
    }
    const selected = (event.selected ?? [])
      .map((element) => element.dataset?.gemId)
      .filter(Boolean)
      .filter((id) => !layers.helpers.isLayerHidden(id) && !layers.helpers.isLayerDeleted(id));
    updateSelectedElements(selected);
  };

  const handleToggleHighlight = () => {
    if (!selectedElementId) {
      return;
    }
    scheduleHistoryCommit("Highlight");
    layers.actions.toggleHighlight(selectedElementId);
  };

  const handleNudgeSelection = (deltaX, deltaY) => {
    if (!isIterationMode || !selectedElementIds.length) {
      return;
    }
    scheduleHistoryCommit("Move");
    transforms.actions.setElementTransforms((current) => {
      let changed = false;
      const next = { ...current };
      selectedElementIds.forEach((id) => {
        if (
          layers.helpers.isLayerHidden(id) ||
          layers.helpers.isLayerLocked(id) ||
          layers.helpers.isLayerDeleted(id)
        ) {
          return;
        }
        const base = normalizeTransform(current[id]);
        next[id] = {
          ...base,
          x: base.x + deltaX,
          y: base.y + deltaY,
        };
        changed = true;
      });
      return changed ? next : current;
    });
  };

  const handleDeleteSelection = () => {
    if (!isIterationMode || !selectedElementIds.length) {
      return;
    }
    scheduleHistoryCommit("Delete");
    const toDelete = selectedElementIds.filter(
      (id) => !layers.helpers.isLayerDeleted(id)
    );
    if (!toDelete.length) {
      updateSelectedElements([]);
      return;
    }
    layers.actions.deleteLayers(toDelete);
    transforms.actions.removeTransformsForIds(toDelete);
    textEditsApiRef.current?.removeTextEditsForIds?.(toDelete);
    updateSelectedElements([]);
  };

  return {
    state: { selectedElementId, selectedElementIds },
    actions: {
      setSelectedElementId,
      setSelectedElementIds,
      updateSelectedElements,
      removeSelectionIds,
      getSelectedIds,
      getPrimaryId,
      handleSelectElement,
      handleSelectoEnd,
      handleToggleHighlight,
      handleNudgeSelection,
      handleDeleteSelection,
    },
  };
}
