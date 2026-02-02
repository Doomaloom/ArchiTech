import { useEffect } from "react";

export default function useIterationLayerEffects({
  isIterationMode,
  iterationSiteRef,
  selectedElementIds,
  highlightedIds,
  parentLayerIds,
  layerState,
  deletedLayerIds,
  isLayerDeleted,
}) {
  useEffect(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return;
    }
    const parentIdSet = new Set(parentLayerIds ?? []);
    const elements = iterationSiteRef.current.querySelectorAll("[data-gem-id]");
    elements.forEach((element) => {
      const id = element.dataset.gemId;
      if (!id) {
        return;
      }
      const layer = layerState[id];
      element.classList.toggle("is-selected", selectedElementIds.includes(id));
      element.classList.toggle("is-highlighted", highlightedIds.includes(id));
      element.classList.toggle("is-nesting-parent", parentIdSet.has(id));
      element.classList.toggle("is-layer-hidden", Boolean(layer?.hidden));
      element.classList.toggle("is-layer-locked", Boolean(layer?.locked));
      element.classList.toggle("is-layer-deleted", isLayerDeleted(id));
    });
  }, [
    deletedLayerIds,
    highlightedIds,
    isIterationMode,
    isLayerDeleted,
    iterationSiteRef,
    parentLayerIds,
    layerState,
    selectedElementIds,
  ]);
}
