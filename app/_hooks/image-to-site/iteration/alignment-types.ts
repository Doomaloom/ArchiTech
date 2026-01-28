import type { RefObject } from "react";
import type { ElementTransform, LayoutMap } from "../../../_lib/iteration-types";

export interface IterationAlignmentOptions {
  isIterationMode: boolean;
  iterationSiteRef: RefObject<HTMLElement>;
  selectedElementIds: string[];
  selectedElementId?: string | null;
  elementTransforms: Record<string, ElementTransform>;
  setElementTransforms: (
    updater: (
      current: Record<string, ElementTransform>
    ) => Record<string, ElementTransform>
  ) => void;
  updateElementTransform?: (
    id: string,
    nextTransform: Partial<ElementTransform>,
    target?: HTMLElement | null
  ) => void;
  scheduleHistoryCommit: (label?: string) => void;
  markSizingSkip?: () => void;
  containerMap: Record<string, string | null | undefined>;
  layout: LayoutMap;
  zoomLevel: number;
  layerHelpers: {
    isLayerHidden: (id: string) => boolean;
    isLayerLocked: (id: string) => boolean;
    isLayerDeleted: (id: string) => boolean;
  };
}
