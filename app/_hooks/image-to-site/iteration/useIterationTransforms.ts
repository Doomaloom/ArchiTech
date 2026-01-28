import { useState } from "react";

import { buildTransformString } from "../../../_lib/geometry";
import { DEFAULT_TRANSFORM, normalizeTransform } from "./constants";
import { getTransformTextElement } from "./dom";
import { NestedTextScaleManager } from "./nested-transform-scale";
import useTransformEngine from "./useTransformEngine";
import useTransformDomSync from "./useTransformDomSync";

const createTransformControlStateGetter =
  (engine, getTransformState) =>
  ({ id, target, textStyles }) => {
    if (!id) {
      return null;
    }
    return engine.getControlState({
      id,
      target: target ?? null,
      currentTransform: getTransformState(id),
      textStyles,
    });
  };

const createScaleHandlers = (engine) => ({
  handleScaleStart: (id, target) => {
    if (!id) {
      return;
    }
    engine.beginScale(id, target ?? null);
  },
  handleScaleEnd: (id) => {
    if (!id) {
      return;
    }
    engine.endScale(id);
  },
});

export default function useIterationTransforms({
  isIterationMode,
  iterationSiteRef,
  scheduleHistoryCommit,
  textEditsApiRef,
}) {
  const [elementTransforms, setElementTransforms] = useState(() => ({}));
  const [scaleLock, setScaleLock] = useState(true);
  const engine = useTransformEngine(textEditsApiRef);
  const nestedScaleManager = new NestedTextScaleManager({
    getTextStyles: (id) => engine.getTextStyles(id),
  });

  useTransformDomSync({
    isIterationMode,
    iterationSiteRef,
    elementTransforms,
  });

  const getTransformState = (id) => {
    if (!id) {
      return DEFAULT_TRANSFORM;
    }
    return normalizeTransform(elementTransforms[id]);
  };

  const getTransformControlState = createTransformControlStateGetter(
    engine,
    getTransformState
  );
  const { handleScaleStart, handleScaleEnd } = createScaleHandlers(engine);

  const updateElementTransform = (id, nextTransform, target) => {
    if (!id) {
      return;
    }
    scheduleHistoryCommit("Transform");
    setElementTransforms((current) => {
      const base = normalizeTransform(current[id]);
      const textStyles = engine.getTextStyles(id);
      const result = engine.applyTransform({
        id,
        target: target ?? null,
        currentTransform: base,
        nextTransform,
        textStyles,
      });
      const nestedUpdates =
        target && !getTransformTextElement(target)
          ? nestedScaleManager.buildUpdates({
              container: target,
              currentTransform: base,
              nextTransform,
              elementTransforms: current,
            })
          : { transformUpdates: {}, textStyleUpdates: {}, domUpdates: [] };
      if (result.textStyles) {
        textEditsApiRef?.current?.applyTextStyles?.(
          id,
          result.textStyles,
          null
        );
      }
      Object.entries(nestedUpdates.textStyleUpdates).forEach(([entryId, styles]) => {
        textEditsApiRef?.current?.applyTextStyles?.(
          entryId,
          styles,
          null
        );
      });
      if (target) {
        target.style.transform = buildTransformString(result.transform);
      }
      nestedUpdates.domUpdates.forEach(({ element, transform }) => {
        element.style.transform = buildTransformString(transform);
      });
      return { ...current, [id]: result.transform, ...nestedUpdates.transformUpdates };
    });
  };

  const removeTransformsForIds = (ids) => {
    if (!ids.length) {
      return;
    }
    setElementTransforms((current) => {
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

  return {
    state: { elementTransforms, scaleLock },
    helpers: { getTransformState, getTransformControlState },
    actions: {
      updateElementTransform,
      removeTransformsForIds,
      setElementTransforms,
      setScaleLock,
      toggleScaleLock: (nextValue?: boolean) =>
        setScaleLock((current) =>
          typeof nextValue === "boolean" ? nextValue : !current
        ),
      handleScaleStart,
      handleScaleEnd,
    },
  };
}
