import { useEffect } from "react";

import { NUDGE_STEP, NUDGE_STEP_LARGE } from "./constants";
import { isEditableTarget } from "./dom";

export default function useIterationSelectionHotkeys({
  isIterationMode,
  selectedElementIds,
  handleDeleteSelection,
  handleNudgeSelection,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isIterationMode) {
        return;
      }
      if (event.key !== "Backspace" && event.key !== "Delete") {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      if (!selectedElementIds.length) {
        return;
      }
      event.preventDefault();
      handleDeleteSelection();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDeleteSelection, isIterationMode, selectedElementIds]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isIterationMode) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      if (!selectedElementIds.length) {
        return;
      }
      const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
      let deltaX = 0;
      let deltaY = 0;
      switch (event.key) {
        case "ArrowLeft":
          deltaX = -step;
          break;
        case "ArrowRight":
          deltaX = step;
          break;
        case "ArrowUp":
          deltaY = -step;
          break;
        case "ArrowDown":
          deltaY = step;
          break;
        default:
          return;
      }
      event.preventDefault();
      handleNudgeSelection(deltaX, deltaY);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNudgeSelection, isIterationMode, selectedElementIds]);
}
