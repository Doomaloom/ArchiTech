import { useEffect } from "react";

import { buildTransformString } from "../../../_lib/geometry";
import { normalizeTransform } from "./constants";

export default function useTransformDomSync({
  isIterationMode,
  iterationSiteRef,
  elementTransforms,
}) {
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
}
