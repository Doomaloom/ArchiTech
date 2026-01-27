import { useMemo } from "react";

const buildNestedChildSizes = (baseLayout, childIds) => {
  if (!childIds?.length || !baseLayout) {
    return {};
  }
  const sizes = {};
  childIds.forEach((id) => {
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
  containerChildIds,
}) {
  const nestedChildSizes = useMemo(() => {
    if (!isIterationMode) {
      return {};
    }
    return buildNestedChildSizes(baseLayout, containerChildIds);
  }, [baseLayout, containerChildIds, isIterationMode]);

  return { state: { nestedChildSizes } };
}
