import { useEffect, useState } from "react";

import { normalizeTransform } from "./constants";
import {
  buildChildrenByParent,
  computeNestedSizingUpdates,
  sizeDeltaExceeded,
} from "./nestedSizingUtils";

export default function useIterationNestedSizing({
  isIterationMode,
  iterationSiteRef,
  baseLayout,
  elementTransforms,
  containerParentMap,
  setElementTransforms,
  zoomLevel,
  isTransforming,
  selectedElementIds,
}) {
  const [elementSizes, setElementSizes] = useState(() => ({}));

  const clearElementSizes = (ids) => {
    if (!ids?.length) {
      return;
    }
    setElementSizes((current) => {
      let changed = false;
      const next = { ...current };
      ids.forEach((id) => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  };

  useEffect(() => {
    if (!isIterationMode) {
      setElementSizes((current) => (Object.keys(current).length ? {} : current));
      return;
    }
    if (!Object.keys(baseLayout).length || !iterationSiteRef.current) {
      return;
    }
    const childrenByParent = buildChildrenByParent(containerParentMap);
    const parentEntries = Object.entries(childrenByParent);
    if (!parentEntries.length) {
      setElementSizes((current) => (Object.keys(current).length ? {} : current));
      return;
    }
    if (isTransforming) {
      return;
    }
    const skipParents = new Set(selectedElementIds ?? []);
    const { sizeUpdates, transformUpdates } = computeNestedSizingUpdates({
      site: iterationSiteRef.current,
      childrenByParent,
      elementTransforms,
      zoomLevel,
      normalizeTransform,
      skipParents,
    });

    if (Object.keys(transformUpdates).length) {
      setElementTransforms((current) => ({
        ...current,
        ...transformUpdates,
      }));
    }

    if (Object.keys(sizeUpdates).length) {
      setElementSizes((current) => {
        let changed = false;
        const next = { ...current };
        Object.entries(sizeUpdates).forEach(([id, size]) => {
          const currentSize = current[id];
          if (
            !currentSize ||
            sizeDeltaExceeded(currentSize, size)
          ) {
            next[id] = {
              width: Math.max(currentSize?.width ?? 0, size.width),
              height: Math.max(currentSize?.height ?? 0, size.height),
            };
            changed = true;
          }
        });
        return changed ? next : current;
      });
    }
  }, [
    baseLayout,
    elementTransforms,
    isIterationMode,
    isTransforming,
    iterationSiteRef,
    containerParentMap,
    selectedElementIds,
    setElementTransforms,
    zoomLevel,
  ]);

  return { state: { elementSizes }, actions: { clearElementSizes } };
}
