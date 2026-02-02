import { useState } from "react";

import { ITERATION_SELECTION_TOOLS } from "../../../_lib/iteration-tools";
import { normalizeTransform } from "./constants";
import { ActiveSelection } from "./selection-state";

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
  const [selectionState, setSelectionState] = useState(() =>
    ActiveSelection.empty()
  );

  const updateSelectedElements = (ids, primaryId) => {
    const nextIds = (ids ?? []).filter(
      (id) => !layers.helpers.isLayerDeleted(id)
    );
    setSelectionState((current) => current.update(nextIds, primaryId));
  };

  const removeSelectionIds = (idsToRemove) => {
    if (!idsToRemove?.length) {
      return;
    }
    setSelectionState((current) =>
      current.update(
        current.selectedIds.filter((id) => !idsToRemove.includes(id))
      )
    );
  };

  const setSelectedElementIds = (ids) => {
    updateSelectedElements(ids, ids?.[0] ?? null);
  };

  const setSelectedElementId = (id) => {
    setSelectionState((current) => current.withPrimary(id));
  };

  const getSelectedIds = () => selectionState.selectedIds;
  const getPrimaryId = () => selectionState.primaryId;

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
      setSelectionState((current) => current.toggle(id));
      return;
    }
    updateSelectedElements([id], id);
  };

  const handleSelectoEnd = (event) => {
    if (isSpacePanning || isPanning) {
      return;
    }
    const selected = (event.selected ?? [])
      .map((element) => element.dataset?.gemId)
      .filter(Boolean)
      .filter(
        (id) => !layers.helpers.isLayerHidden(id) && !layers.helpers.isLayerDeleted(id)
      );
    const primaryId = selected.length ? selected[selected.length - 1] : null;
    updateSelectedElements(selected, primaryId);
  };

  const handleToggleHighlight = () => {
    const primaryId = selectionState.primaryId;
    if (!primaryId) {
      return;
    }
    scheduleHistoryCommit("Highlight");
    layers.actions.toggleHighlight(primaryId);
  };

  const handleNudgeSelection = (deltaX, deltaY) => {
    if (!isIterationMode || !selectionState.selectedIds.length) {
      return;
    }
    scheduleHistoryCommit("Move");
    transforms.actions.setElementTransforms((current) => {
      let changed = false;
      const next = { ...current };
      selectionState.selectedIds.forEach((id) => {
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
    if (!isIterationMode || !selectionState.selectedIds.length) {
      return;
    }
    scheduleHistoryCommit("Delete");
    const toDelete = selectionState.selectedIds.filter(
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
    state: {
      selectedElementId: selectionState.primaryId,
      selectedElementIds: selectionState.selectedIds,
    },
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
