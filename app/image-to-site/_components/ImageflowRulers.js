"use client";

import { useEffect, useMemo, useRef } from "react";
import { useImageToSite } from "../_context/image-to-site-context";

const MINOR_STEP = 10;
const MID_STEP = 50;
const LABEL_STEP = 100;

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

const buildMarks = (minValue, maxValue) => {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return [];
  }
  if (maxValue <= minValue) {
    return [];
  }
  const marks = [];
  const start = Math.floor(minValue / MINOR_STEP) * MINOR_STEP;
  const end = Math.ceil(maxValue / MINOR_STEP) * MINOR_STEP;
  for (let value = start; value <= end; value += MINOR_STEP) {
    const isMajor = value % LABEL_STEP === 0;
    const isMid = !isMajor && value % MID_STEP === 0;
    marks.push({
      value,
      isMajor,
      isMid,
    });
  }
  return marks;
};

export default function ImageflowRulers() {
  const { derived, actions, refs } = useImageToSite();
  const dragHandlersRef = useRef(null);

  const horizontalMarks = useMemo(() => {
    const width = derived.stageSize?.width ?? 0;
    if (!width || !derived.zoomLevel) {
      return [];
    }
    const minValue = -derived.panOffset.x / derived.zoomLevel;
    const maxValue = (width - derived.panOffset.x) / derived.zoomLevel;
    return buildMarks(minValue, maxValue)
      .map((mark) => ({
        ...mark,
        position: mark.value * derived.zoomLevel + derived.panOffset.x,
      }))
      .filter((mark) => mark.position >= -MINOR_STEP && mark.position <= width + MINOR_STEP);
  }, [derived.panOffset.x, derived.stageSize?.width, derived.zoomLevel]);

  const verticalMarks = useMemo(() => {
    const height = derived.stageSize?.height ?? 0;
    if (!height || !derived.zoomLevel) {
      return [];
    }
    const minValue = -derived.panOffset.y / derived.zoomLevel;
    const maxValue = (height - derived.panOffset.y) / derived.zoomLevel;
    return buildMarks(minValue, maxValue)
      .map((mark) => ({
        ...mark,
        position: mark.value * derived.zoomLevel + derived.panOffset.y,
      }))
      .filter((mark) => mark.position >= -MINOR_STEP && mark.position <= height + MINOR_STEP);
  }, [derived.panOffset.y, derived.stageSize?.height, derived.zoomLevel]);

  useEffect(() => {
    return () => {
      const handlers = dragHandlersRef.current;
      if (handlers) {
        window.removeEventListener("pointermove", handlers.onMove);
        window.removeEventListener("pointerup", handlers.onEnd);
      }
    };
  }, []);

  const handleRulerPointerDown = (event, axis) => {
    if (!derived.isIterationMode || !refs.iterationPreviewRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const bounds = refs.iterationPreviewRef.current.getBoundingClientRect();
    const point = getPointerFromEvent(
      event,
      bounds,
      derived.panOffset,
      derived.zoomLevel
    );
    const position = axis === "vertical" ? point?.x : point?.y;
    const guideId = actions.handleCreateGuide?.(axis, position);
    if (!guideId) {
      return;
    }

    const handleGuideMove = (moveEvent) => {
      const nextPoint = getPointerFromEvent(
        moveEvent,
        bounds,
        derived.panOffset,
        derived.zoomLevel
      );
      if (!nextPoint) {
        return;
      }
      const nextPosition = axis === "vertical" ? nextPoint.x : nextPoint.y;
      actions.handleUpdateGuide(guideId, nextPosition);
    };
    const handleGuideEnd = () => {
      const handlers = dragHandlersRef.current;
      if (!handlers) {
        return;
      }
      window.removeEventListener("pointermove", handlers.onMove);
      window.removeEventListener("pointerup", handlers.onEnd);
      dragHandlersRef.current = null;
    };

    if (dragHandlersRef.current) {
      window.removeEventListener("pointermove", dragHandlersRef.current.onMove);
      window.removeEventListener("pointerup", dragHandlersRef.current.onEnd);
    }
    dragHandlersRef.current = {
      onMove: handleGuideMove,
      onEnd: handleGuideEnd,
    };
    window.addEventListener("pointermove", handleGuideMove);
    window.addEventListener("pointerup", handleGuideEnd);
  };

  if (!derived.isIterationMode) {
    return null;
  }

  return (
    <div className="imageflow-rulers" aria-hidden="true">
      <div
        className="imageflow-ruler imageflow-ruler-horizontal"
        role="separator"
        aria-orientation="horizontal"
        onPointerDown={(event) => handleRulerPointerDown(event, "horizontal")}
      >
        <div className="imageflow-ruler-scale is-horizontal">
          {horizontalMarks.map((mark) => (
            <div
              key={`h-${mark.value}`}
              className={`imageflow-ruler-mark is-horizontal${
                mark.isMajor ? " is-major" : mark.isMid ? " is-mid" : ""
              }`}
              style={{ left: `${mark.position}px` }}
            >
              {mark.isMajor ? (
                <span className="imageflow-ruler-label is-horizontal">
                  {mark.value}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div
        className="imageflow-ruler imageflow-ruler-vertical"
        role="separator"
        aria-orientation="vertical"
        onPointerDown={(event) => handleRulerPointerDown(event, "vertical")}
      >
        <div className="imageflow-ruler-scale is-vertical">
          {verticalMarks.map((mark) => (
            <div
              key={`v-${mark.value}`}
              className={`imageflow-ruler-mark is-vertical${
                mark.isMajor ? " is-major" : mark.isMid ? " is-mid" : ""
              }`}
              style={{ top: `${mark.position}px` }}
            >
              {mark.isMajor ? (
                <span className="imageflow-ruler-label is-vertical">
                  {mark.value}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
