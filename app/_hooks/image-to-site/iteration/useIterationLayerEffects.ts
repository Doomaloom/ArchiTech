import { useEffect } from "react";

export default function useIterationLayerEffects({
  isIterationMode,
  iterationSiteRef,
  selectedElementIds,
  highlightedIds,
  layerState,
  deletedLayerIds,
  isLayerDeleted,
}) {
  useEffect(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return;
    }
    const elements = iterationSiteRef.current.querySelectorAll("[data-gem-id]");
    elements.forEach((element) => {
      const id = element.dataset.gemId;
      if (!id) {
        return;
      }
      const layer = layerState[id];
      element.classList.toggle("is-selected", selectedElementIds.includes(id));
      element.classList.toggle("is-highlighted", highlightedIds.includes(id));
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
    layerState,
    selectedElementIds,
  ]);
}
