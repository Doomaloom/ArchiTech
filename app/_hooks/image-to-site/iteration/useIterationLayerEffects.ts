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
      const isSelected = selectedElementIds.includes(id);
      const isHighlighted = highlightedIds.includes(id);
      const handlers = (element as HTMLElement & {
        _highlightHoverHandlers?: {
          enter: () => void;
          leave: () => void;
        };
      })._highlightHoverHandlers;

      element.classList.toggle("is-selected", isSelected);
      element.classList.toggle("is-highlighted", isHighlighted);

      if (isHighlighted) {
        if (!handlers) {
          const enter = () => element.classList.add("is-highlight-hovered");
          const leave = () => element.classList.remove("is-highlight-hovered");
          element.addEventListener("pointerenter", enter);
          element.addEventListener("pointerleave", leave);
          (element as any)._highlightHoverHandlers = { enter, leave };
        }
      } else {
        element.classList.remove("is-highlight-hovered");
        if (handlers) {
          element.removeEventListener("pointerenter", handlers.enter);
          element.removeEventListener("pointerleave", handlers.leave);
          delete (element as any)._highlightHoverHandlers;
        }
      }
      element.classList.toggle("is-nesting-parent", parentIdSet.has(id));
      element.classList.toggle("is-layer-hidden", Boolean(layer?.hidden));
      element.classList.toggle("is-layer-locked", Boolean(layer?.locked));
      element.classList.toggle("is-layer-deleted", isLayerDeleted(id));
    });

    return () => {
      const cleanupElements =
        iterationSiteRef.current?.querySelectorAll("[data-gem-id]") ?? [];
      cleanupElements.forEach((element) => {
        const hoverHandlers = (element as any)._highlightHoverHandlers;
        if (hoverHandlers) {
          element.removeEventListener("pointerenter", hoverHandlers.enter);
          element.removeEventListener("pointerleave", hoverHandlers.leave);
          delete (element as any)._highlightHoverHandlers;
        }
        element.classList.remove("is-highlight-hovered");
      });
    };
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
