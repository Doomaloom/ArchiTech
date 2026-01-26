import { useEffect, useState } from "react";

import { buildTransformString } from "../../../_lib/geometry";
import { DEFAULT_TRANSFORM, normalizeTransform } from "./constants";

export default function useIterationTransforms({
  isIterationMode,
  iterationSiteRef,
  scheduleHistoryCommit,
}) {
  const [elementTransforms, setElementTransforms] = useState(() => ({}));

  useEffect(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return;
    }
    const elements = iterationSiteRef.current.querySelectorAll("[data-gem-id]");
    elements.forEach((element) => {
      const id = element.dataset.gemId;
      if (!id) {
        return;
      }
      const transform = normalizeTransform(elementTransforms[id]);
      element.style.transform = buildTransformString(transform);
    });
  }, [elementTransforms, isIterationMode, iterationSiteRef]);

  const getTransformState = (id) => {
    if (!id) {
      return DEFAULT_TRANSFORM;
    }
    return normalizeTransform(elementTransforms[id]);
  };

  const updateElementTransform = (id, nextTransform, target) => {
    if (!id) {
      return;
    }
    scheduleHistoryCommit("Transform");
    setElementTransforms((current) => {
      const base = normalizeTransform(current[id]);
      const merged = { ...base, ...nextTransform };
      if (target) {
        target.style.transform = buildTransformString(merged);
      }
      return { ...current, [id]: merged };
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
    state: { elementTransforms },
    helpers: { getTransformState },
    actions: {
      updateElementTransform,
      removeTransformsForIds,
      setElementTransforms,
    },
  };
}
