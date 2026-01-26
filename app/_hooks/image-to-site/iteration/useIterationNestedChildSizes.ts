import { useMemo } from "react";

const buildNestedChildSizes = (baseLayout, nestedLayerIds) => {
  if (!nestedLayerIds?.length || !baseLayout) {
    return {};
  }
  const sizes = {};
  nestedLayerIds.forEach((id) => {
    const entry = baseLayout[id];
    if (!entry?.base) {
      return;
    }
    sizes[id] = { width: entry.base.width };
  });
  return sizes;
};

export default function useIterationNestedChildSizes({
  isIterationMode,
  baseLayout,
  nestedLayerIds,
}) {
  const nestedChildSizes = useMemo(() => {
    if (!isIterationMode) {
      return {};
    }
    return buildNestedChildSizes(baseLayout, nestedLayerIds);
  }, [baseLayout, isIterationMode, nestedLayerIds]);

  return { state: { nestedChildSizes } };
}
