import { useEffect } from "react";

import { isEditableTarget } from "./dom";

export default function useIterationZoomHotkeys({
  isIterationMode,
  applyZoom,
  getPreviewCenter,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isIterationMode) {
        return;
      }
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      const point = getPreviewCenter();
      if (!point) {
        return;
      }
      if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") {
        event.preventDefault();
        applyZoom(point, 1);
        return;
      }
      if (event.key === "-" || event.code === "NumpadSubtract") {
        event.preventDefault();
        applyZoom(point, -1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [applyZoom, getPreviewCenter, isIterationMode]);
}
