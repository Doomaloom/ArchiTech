import { useEffect, useRef, useState } from "react";

import { isEditableTarget } from "./dom";
import { clampValue } from "./geometry";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "./constants";

export default function useIterationViewport({
  isIterationMode,
  isZoomTool,
  isPanTool,
  iterationPreviewRef,
}) {
  const [zoomState, setZoomState] = useState(() => ({
    zoom: 1,
    pan: { x: 0, y: 0 },
  }));
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef(null);

  const getPreviewPoint = (event) => {
    const bounds = iterationPreviewRef.current?.getBoundingClientRect();
    const clientX = event?.clientX ?? event?.evt?.clientX;
    const clientY = event?.clientY ?? event?.evt?.clientY;
    if (!bounds || clientX == null || clientY == null) {
      return null;
    }
    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    };
  };

  const getPreviewCenter = () => {
    const bounds = iterationPreviewRef.current?.getBoundingClientRect();
    if (!bounds) {
      return null;
    }
    return {
      x: bounds.width / 2,
      y: bounds.height / 2,
    };
  };

  const applyZoom = (point, direction) => {
    if (!point) {
      return;
    }
    setZoomState((current) => {
      const nextZoom = clampValue(
        current.zoom + direction * ZOOM_STEP,
        ZOOM_MIN,
        ZOOM_MAX
      );
      if (nextZoom === current.zoom) {
        return current;
      }
      const contentX = (point.x - current.pan.x) / current.zoom;
      const contentY = (point.y - current.pan.y) / current.zoom;
      return {
        zoom: nextZoom,
        pan: {
          x: point.x - contentX * nextZoom,
          y: point.y - contentY * nextZoom,
        },
      };
    });
  };

  const handleZoomPointer = (event) => {
    if (!isIterationMode || !isZoomTool) {
      return;
    }
    if (isSpacePanning) {
      return;
    }
    if (event.button != null && event.button !== 0) {
      return;
    }
    const point = getPreviewPoint(event);
    if (!point) {
      return;
    }
    const direction = event.altKey ? -1 : 1;
    applyZoom(point, direction);
  };

  const handleZoomWheel = (event) => {
    if (!isIterationMode) {
      return;
    }
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    const point = getPreviewPoint(event);
    if (!point) {
      return;
    }
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    applyZoom(point, direction);
  };

  const handlePanPointerDown = (event) => {
    if (!isIterationMode) {
      return;
    }
    const allowPan = isSpacePanning || isPanTool || event.button === 1;
    if (!allowPan) {
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }
    const point = getPreviewPoint(event);
    if (!point) {
      return;
    }
    event.preventDefault();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    panStartRef.current = {
      x: point.x,
      y: point.y,
      panX: zoomState.pan.x,
      panY: zoomState.pan.y,
    };
    setIsPanning(true);
  };

  useEffect(() => {
    if (!isIterationMode) {
      return;
    }
    const element = iterationPreviewRef.current;
    if (!element) {
      return;
    }
    const handleWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
    };
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [isIterationMode, iterationPreviewRef]);

  const handlePanPointerMove = (event) => {
    const start = panStartRef.current;
    if (!start) {
      return;
    }
    const point = getPreviewPoint(event);
    if (!point) {
      return;
    }
    const deltaX = point.x - start.x;
    const deltaY = point.y - start.y;
    setZoomState((current) => ({
      ...current,
      pan: {
        x: start.panX + deltaX,
        y: start.panY + deltaY,
      },
    }));
  };

  const handlePanPointerEnd = (event) => {
    if (!panStartRef.current) {
      return;
    }
    panStartRef.current = null;
    event?.currentTarget?.releasePointerCapture?.(event.pointerId);
    setIsPanning(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== "Space") {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      setIsSpacePanning(true);
    };
    const handleKeyUp = (event) => {
      if (event.code !== "Space") {
        return;
      }
      setIsSpacePanning(false);
      setIsPanning(false);
      panStartRef.current = null;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (isIterationMode) {
      return;
    }
    setZoomState({ zoom: 1, pan: { x: 0, y: 0 } });
    setIsPanning(false);
    setIsSpacePanning(false);
    panStartRef.current = null;
  }, [isIterationMode]);

  const zoomLevel = zoomState.zoom;
  const panOffset = zoomState.pan;
  const isPanMode = isSpacePanning || isPanTool;

  return {
    state: { zoomState, isSpacePanning, isPanning },
    derived: { zoomLevel, panOffset, isPanMode },
    actions: {
      handleZoomPointer,
      handleZoomWheel,
      handlePanPointerDown,
      handlePanPointerMove,
      handlePanPointerEnd,
      applyZoom,
      getPreviewCenter,
    },
  };
}
