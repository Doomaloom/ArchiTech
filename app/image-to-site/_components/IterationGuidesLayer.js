"use client";

import { useEffect, useRef } from "react";
import { useImageToSite } from "../_context/image-to-site-context";

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

const getPointerFromEvent = (
  event,
  bounds,
  panOffset = { x: 0, y: 0 },
  zoomLevel = 1
) => {
  const clientX = event?.evt?.clientX ?? event?.clientX;
  const clientY = event?.evt?.clientY ?? event?.clientY;
  if (clientX == null || clientY == null || !bounds) {
    return null;
  }
  return {
    x: (clientX - bounds.left - panOffset.x) / zoomLevel,
    y: (clientY - bounds.top - panOffset.y) / zoomLevel,
  };
};

export default function IterationGuidesLayer() {
  const { state, derived, actions, refs } = useImageToSite();
  const dragStateRef = useRef(null);
  const dragHandlersRef = useRef(null);

  useEffect(() => {
    return () => {
      const handlers = dragHandlersRef.current;
      if (handlers) {
        window.removeEventListener("pointermove", handlers.onMove);
        window.removeEventListener("pointerup", handlers.onEnd);
      }
    };
  }, []);

  const handleGuidePointerDown = (event, guide) => {
    if (!refs.iterationPreviewRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const bounds = refs.iterationPreviewRef.current.getBoundingClientRect();
    dragStateRef.current = {
      id: guide.id,
      axis: guide.axis,
      bounds,
    };
    const handleGuideMove = (moveEvent) => {
      const stateRef = dragStateRef.current;
      if (!stateRef) {
        return;
      }
      const point = getPointerFromEvent(
        moveEvent,
        stateRef.bounds,
        derived.panOffset,
        derived.zoomLevel
      );
      if (!point) {
        return;
      }
      const raw = stateRef.axis === "vertical" ? point.x : point.y;
      const max = stateRef.axis === "vertical"
        ? stateRef.bounds.width
        : stateRef.bounds.height;
      const nextPosition = clampValue(raw, 0, max);
      actions.handleUpdateGuide(stateRef.id, Math.round(nextPosition));
    };
    const handleGuideEnd = () => {
      dragStateRef.current = null;
      window.removeEventListener("pointermove", handleGuideMove);
      window.removeEventListener("pointerup", handleGuideEnd);
      dragHandlersRef.current = null;
    };
    dragHandlersRef.current = {
      onMove: handleGuideMove,
      onEnd: handleGuideEnd,
    };
    window.addEventListener("pointermove", handleGuideMove);
    window.addEventListener("pointerup", handleGuideEnd);
  };

  if (!state.showGrid && !state.showGuides) {
    return null;
  }

  return (
    <>
      {state.showGrid ? (
        <div
          className="imageflow-iteration-grid"
          style={{ "--grid-size": `${state.gridSize}px` }}
        />
      ) : null}
      {state.showGuides ? (
        <div className="imageflow-iteration-guides" role="presentation">
          {(state.guides ?? []).map((guide) => (
            <div
              key={guide.id}
              className={`imageflow-guide-line is-${guide.axis}`}
              style={
                guide.axis === "vertical"
                  ? { left: `${guide.position}px`, "--guide-color": guide.color }
                  : { top: `${guide.position}px`, "--guide-color": guide.color }
              }
              onPointerDown={(event) => handleGuidePointerDown(event, guide)}
              onDoubleClick={() => actions.handleRemoveGuide(guide.id)}
              role="separator"
              aria-orientation={
                guide.axis === "vertical" ? "vertical" : "horizontal"
              }
              aria-label={`${
                guide.axis === "vertical" ? "Vertical" : "Horizontal"
              } guide`}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
