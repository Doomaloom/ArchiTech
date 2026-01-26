import { useEffect, useMemo, useRef, useState } from "react";

import { normalizeTransform } from "./constants";

const buildDetachedLayerIds = (
  baseLayout,
  layerParentMap,
  isIterationMode,
  hasFolderState
) => {
  if (!isIterationMode || !baseLayout) {
    return [];
  }
  const hasFolderEntries = Object.values(baseLayout).some(
    (entry) => entry.folderId
  );
  if (hasFolderEntries && !hasFolderState) {
    return [];
  }
  return Object.values(baseLayout)
    .filter(
      (entry) =>
        entry.folderId &&
        entry.parentId &&
        entry.parentId !== "root" &&
        !layerParentMap?.[entry.id]
    )
    .map((entry) => entry.id);
};

const getCenterFromRect = (rect, containerRect) => ({
  x: rect.left - containerRect.left + rect.width / 2,
  y: rect.top - containerRect.top + rect.height / 2,
});

const getElementSize = (element, rect, zoomLevel) => {
  const zoom = zoomLevel || 1;
  return {
    width: element?.offsetWidth || rect.width / zoom,
    height: element?.offsetHeight || rect.height / zoom,
  };
};

const applyDetachedStyles = (element, base, size) => {
  if (!element || !base || !size) {
    return;
  }
  element.style.position = "absolute";
  element.style.left = `${base.x}px`;
  element.style.top = `${base.y}px`;
  element.style.width = `${size.width}px`;
  element.style.height = `${size.height}px`;
  element.style.margin = "0";
  element.setAttribute("data-gem-detached", "true");
};

const clearDetachedStyles = (element) => {
  if (!element) {
    return;
  }
  element.style.removeProperty("position");
  element.style.removeProperty("left");
  element.style.removeProperty("top");
  element.style.removeProperty("width");
  element.style.removeProperty("height");
  element.style.removeProperty("margin");
  element.removeAttribute("data-gem-detached");
};

const updateTransformByDelta = (transform, delta) => {
  if (Math.abs(delta.x) < 0.1 && Math.abs(delta.y) < 0.1) {
    return transform;
  }
  return {
    ...transform,
    x: transform.x + delta.x,
    y: transform.y + delta.y,
  };
};

export default function useIterationDetachedLayers({
  isIterationMode,
  iterationSiteRef,
  baseLayout,
  layerParentMap,
  hasFolderState,
  elementTransforms,
  setElementTransforms,
  zoomLevel,
}) {
  const [detachedSizes, setDetachedSizes] = useState(() => ({}));
  const detachedLayerIds = useMemo(
    () =>
      buildDetachedLayerIds(
        baseLayout,
        layerParentMap,
        isIterationMode,
        hasFolderState
      ),
    [baseLayout, hasFolderState, isIterationMode, layerParentMap]
  );
  const detachedIdsRef = useRef(new Set());

  useEffect(() => {
    const container = iterationSiteRef.current;
    if (!isIterationMode || !container) {
      if (detachedIdsRef.current.size && container) {
        detachedIdsRef.current.forEach((id) => {
          const element = container.querySelector(`[data-gem-id="${id}"]`);
          if (element) {
            clearDetachedStyles(element);
          }
        });
      }
      detachedIdsRef.current = new Set();
      setDetachedSizes((current) =>
        Object.keys(current).length ? {} : current
      );
      return;
    }

    const nextDetached = new Set(detachedLayerIds);
    const prevDetached = detachedIdsRef.current;
    const newlyDetached = Array.from(nextDetached).filter(
      (id) => !prevDetached.has(id)
    );
    const newlyAttached = Array.from(prevDetached).filter(
      (id) => !nextDetached.has(id)
    );

    if (!newlyDetached.length && !newlyAttached.length) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const zoom = zoomLevel || 1;
    const transformUpdates = {};
    const sizeUpdates = {};

    newlyDetached.forEach((id) => {
      const entry = baseLayout?.[id];
      const element = container.querySelector(`[data-gem-id="${id}"]`);
      if (!entry?.base || !element) {
        return;
      }
      const rect = element.getBoundingClientRect();
      const currentCenter = getCenterFromRect(rect, containerRect);
      const normalizedCenter = {
        x: currentCenter.x / zoom,
        y: currentCenter.y / zoom,
      };
      const size = getElementSize(element, rect, zoom);
      const baseCenter = {
        x: entry.base.x + size.width / 2,
        y: entry.base.y + size.height / 2,
      };
      const transform = normalizeTransform(elementTransforms?.[id]);
      const expectedCenter = {
        x: baseCenter.x + transform.x,
        y: baseCenter.y + transform.y,
      };
      const delta = {
        x: normalizedCenter.x - expectedCenter.x,
        y: normalizedCenter.y - expectedCenter.y,
      };
      transformUpdates[id] = updateTransformByDelta(transform, delta);
      if (element.parentElement !== container) {
        container.appendChild(element);
      }
      applyDetachedStyles(element, entry.base, size);
      sizeUpdates[id] = { width: size.width, height: size.height };
    });

    newlyAttached.forEach((id) => {
      const entry = baseLayout?.[id];
      const element = container.querySelector(`[data-gem-id="${id}"]`);
      if (!entry || !element) {
        return;
      }
      const parentId = entry.parentId;
      const parentElement =
        parentId && parentId !== "root"
          ? container.querySelector(`[data-gem-id="${parentId}"]`)
          : null;
      if (parentElement && element.parentElement !== parentElement) {
        parentElement.appendChild(element);
      }
      clearDetachedStyles(element);
    });

    if (Object.keys(transformUpdates).length) {
      setElementTransforms((current) => ({ ...current, ...transformUpdates }));
    }
    if (Object.keys(sizeUpdates).length || newlyAttached.length) {
      setDetachedSizes((current) => {
        let changed = false;
        const next = { ...current };
        Object.entries(sizeUpdates).forEach(([id, size]) => {
          next[id] = size;
          changed = true;
        });
        newlyAttached.forEach((id) => {
          if (next[id]) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : current;
      });
    }

    detachedIdsRef.current = nextDetached;
  }, [
    baseLayout,
    detachedLayerIds,
    elementTransforms,
    isIterationMode,
    iterationSiteRef,
    setElementTransforms,
    zoomLevel,
  ]);

  return {
    state: { detachedSizes },
    derived: { detachedLayerIds },
  };
}
