import { useCallback, useMemo, useRef } from "react";
import type { AlignmentCommand } from "./alignment-engine";
import { AlignmentEngine, createAlignmentEngine } from "./alignment-engine";
import {
  AlignmentApplier,
  EngineAlignmentWriter,
  StateAlignmentWriter,
} from "./alignment-applier";
import { AlignmentScopeResolver } from "./alignment-resolvers";
import type { IterationAlignmentOptions } from "./alignment-types";
import {
  buildAlignmentTargets,
  filterAlignableIds,
  getRect,
  resolveAlignmentContainerElement,
  resolveAlignmentScopeLabel,
} from "./alignment-utils";

export default function useIterationAlignment({
  isIterationMode,
  iterationSiteRef,
  selectedElementIds,
  selectedElementId,
  elementTransforms,
  setElementTransforms,
  updateElementTransform,
  scheduleHistoryCommit,
  markSizingSkip,
  containerMap,
  zoomLevel,
  layout,
  layerHelpers,
}: IterationAlignmentOptions) {
  const engineRef = useRef<AlignmentEngine>(createAlignmentEngine());
  const alignableIds = useMemo(() => {
    const primarySelection = filterAlignableIds(
      selectedElementIds,
      layerHelpers
    );
    if (primarySelection.length) {
      const primaryId = selectedElementId;
      if (primaryId && !primarySelection.includes(primaryId)) {
        const primaryFallback = filterAlignableIds(
          [primaryId],
          layerHelpers
        );
        if (primaryFallback.length) {
          return primaryFallback;
        }
      }
      return primarySelection;
    }
    if (!selectedElementId) {
      return [];
    }
    return filterAlignableIds([selectedElementId], layerHelpers);
  }, [selectedElementIds, selectedElementId, layerHelpers]);
  const scopeResolver = useMemo(
    () => new AlignmentScopeResolver(containerMap),
    [containerMap]
  );
  const alignmentScopeId = useMemo(
    () => scopeResolver.resolve(alignableIds),
    [alignableIds, scopeResolver]
  );
  const alignmentScopeLabel = useMemo(
    () => resolveAlignmentScopeLabel(alignmentScopeId, layout),
    [alignmentScopeId, layout]
  );
  const alignmentWriter = useMemo(() => {
    if (updateElementTransform) {
      return new EngineAlignmentWriter(updateElementTransform);
    }
    return new StateAlignmentWriter(setElementTransforms);
  }, [setElementTransforms, updateElementTransform]);

  const handleAlign = useCallback(
    (command: AlignmentCommand) => {
      if (!isIterationMode) {
        return;
      }
      if (!alignableIds.length || !iterationSiteRef.current) {
        return;
      }
      const containerId = scopeResolver.resolve(alignableIds);
      const site = iterationSiteRef.current;
      const { targets, elementMap } = buildAlignmentTargets(site, alignableIds);
      if (!targets.length) {
        return;
      }
      const containerElement = resolveAlignmentContainerElement({
        site,
        containerId,
        elementMap,
        alignableIds,
      });
      if (!containerElement) {
        return;
      }
      let containerRect = getRect(containerElement);
      if (
        alignableIds.length === 1 &&
        containerElement !== site &&
        targets.length === 1
      ) {
        const targetRect = targets[0].rect;
        const rectMatches =
          Math.abs(containerRect.left - targetRect.left) < 0.5 &&
          Math.abs(containerRect.top - targetRect.top) < 0.5 &&
          Math.abs(containerRect.width - targetRect.width) < 0.5 &&
          Math.abs(containerRect.height - targetRect.height) < 0.5;
        if (rectMatches) {
          containerRect = getRect(site);
        }
      }
      const deltas = engineRef.current.align(command, containerRect, targets);
      const hasDelta = deltas.some(({ deltaX, deltaY }) => Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1);
      if (!hasDelta) {
        return;
      }
      markSizingSkip?.();
      const applier = new AlignmentApplier({
        containerMap,
        zoomLevel,
        scheduleHistoryCommit,
        writer: alignmentWriter,
      });
      applier.apply(deltas, elementMap, elementTransforms);
    },
    [
      alignableIds,
      containerMap,
      elementTransforms,
      isIterationMode,
      iterationSiteRef,
      layout,
      markSizingSkip,
      scheduleHistoryCommit,
      scopeResolver,
      alignmentWriter,
      zoomLevel,
    ]
  );

  return {
    derived: {
      alignmentScopeLabel,
      canAlign: alignableIds.length > 0,
    },
    actions: {
      handleAlign,
    },
  };
}
