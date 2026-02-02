import { useMemo } from "react";
import type { RefObject } from "react";

import type { ContainerGraph, LayoutMap } from "../../../_lib/iteration-types";
import { buildContainerMap } from "./containerUtils";

export default function useIterationContainers({
  isIterationMode,
  iterationSiteRef,
  layerParentMap,
  detachedLayerIds,
  baseLayout,
}: {
  isIterationMode: boolean;
  iterationSiteRef: RefObject<HTMLElement>;
  layerParentMap: Record<string, string | null | undefined>;
  detachedLayerIds?: string[];
  baseLayout: LayoutMap;
}) {
  const containerMap = useMemo(
    () =>
      isIterationMode
        ? buildContainerMap({
            site: iterationSiteRef.current,
            layerParentMap,
            detachedIds: detachedLayerIds,
          })
        : {},
    [
      baseLayout,
      detachedLayerIds,
      isIterationMode,
      iterationSiteRef,
      layerParentMap,
    ]
  );

  const containerChildIds = useMemo(
    () => Object.keys(containerMap),
    [containerMap]
  );

  const containerParentIds = useMemo(() => {
    const parents = new Set(Object.values(containerMap));
    return Array.from(parents).filter(Boolean);
  }, [containerMap]);

  const containerGraph: ContainerGraph = useMemo(
    () => ({
      map: containerMap,
      childIds: containerChildIds,
      parentIds: containerParentIds,
    }),
    [containerChildIds, containerMap, containerParentIds]
  );

  return {
    derived: {
      containerGraph,
    },
  };
}
