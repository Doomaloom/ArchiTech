import { useLayoutEffect, useRef } from "react";

export default function useIterationSizeEffects({
  isIterationMode,
  iterationSiteRef,
  elementSizes,
}) {
  const appliedIdsRef = useRef<Set<string>>(new Set<string>());

  useLayoutEffect(() => {
    const site = iterationSiteRef.current;
    if (!isIterationMode || !site) {
      if (site) {
        appliedIdsRef.current.forEach((id) => {
          const element = site.querySelector(`[data-gem-id="${id}"]`);
          if (!element) {
            return;
          }
          element.style.removeProperty("width");
          element.style.removeProperty("height");
        });
      }
      appliedIdsRef.current.clear();
      return;
    }
    const nextIds = new Set<string>(Object.keys(elementSizes ?? {}));

    appliedIdsRef.current.forEach((id) => {
      if (nextIds.has(id)) {
        return;
      }
      const element = site.querySelector(`[data-gem-id="${id}"]`);
      if (!element) {
        return;
      }
      element.style.removeProperty("width");
      element.style.removeProperty("height");
    });

    nextIds.forEach((id) => {
      const element = site.querySelector(`[data-gem-id="${id}"]`);
      if (!element) {
        return;
      }
      const size = elementSizes[id];
      if (!size) {
        return;
      }
      if (size.width != null) {
        element.style.width = `${size.width}px`;
      } else {
        element.style.removeProperty("width");
      }
      if (size.height != null) {
        element.style.height = `${size.height}px`;
      } else {
        element.style.removeProperty("height");
      }
    });

    appliedIdsRef.current = nextIds;
  }, [elementSizes, isIterationMode, iterationSiteRef]);
}
