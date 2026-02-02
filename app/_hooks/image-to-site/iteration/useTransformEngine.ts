import { useRef } from "react";

import { createTransformEngine } from "./transform-tools";

export default function useTransformEngine(textEditsApiRef) {
  const engineRef = useRef(createTransformEngine());

  const getTextStyles = (id) =>
    textEditsApiRef?.current?.getTextStyles?.(id) ?? null;

  const applyTransform = (input) =>
    engineRef.current.applyTransform({
      ...input,
      textStyles: input.textStyles ?? getTextStyles(input.id),
    });

  const getControlState = (input) =>
    engineRef.current.getControlState({
      ...input,
      textStyles: input.textStyles ?? getTextStyles(input.id),
    });

  const beginScale = (id, target) =>
    engineRef.current.beginScale(id, target ?? null, getTextStyles(id));

  const endScale = (id) => engineRef.current.endScale(id);

  return {
    applyTransform,
    beginScale,
    endScale,
    getControlState,
    getTextStyles,
  };
}
