import { useEffect, useState } from "react";

import { isPointInPolygon } from "../../../_lib/geometry";
import { NOTE_RADIUS_MIN, normalizeTransform } from "./constants";
import { getPointerFromEvent } from "./geometry";

export default function useIterationAnnotations({
  isIterationMode,
  iterationTool,
  overlayMode,
  iterationPreviewRef,
  panOffset,
  zoomLevel,
  baseLayout,
  elementTransforms,
  isLayerHidden,
  isLayerDeleted,
  updateSelectedElements,
  scheduleHistoryCommit,
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftCircle, setDraftCircle] = useState(null);
  const [pendingAnnotation, setPendingAnnotation] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [annotations, setAnnotations] = useState([]);
  const [pencilPoints, setPencilPoints] = useState([]);
  const [isPencilDrawing, setIsPencilDrawing] = useState(false);

  useEffect(() => {
    setDraftCircle(null);
    setIsDrawing(false);
    setIsPencilDrawing(false);
    setPencilPoints([]);
  }, [iterationTool]);

  useEffect(() => {
    if (isIterationMode) {
      return;
    }
    setDraftCircle(null);
    setIsDrawing(false);
    setPendingAnnotation(null);
    setNoteDraft("");
    setIsPencilDrawing(false);
    setPencilPoints([]);
  }, [isIterationMode]);

  const handleOverlayPointerDown = (event) => {
    if (!isIterationMode || !overlayMode) {
      return;
    }
    const bounds = iterationPreviewRef.current?.getBoundingClientRect();
    const point = getPointerFromEvent(event, bounds, panOffset, zoomLevel);
    if (!point) {
      return;
    }
    if (overlayMode === "note") {
      setIsDrawing(true);
      setDraftCircle({
        x: point.x,
        y: point.y,
        radius: 0,
        startX: point.x,
        startY: point.y,
      });
      setPendingAnnotation(null);
      setNoteDraft("");
      return;
    }
    if (overlayMode === "pencil") {
      setIsPencilDrawing(true);
      setPencilPoints([point.x, point.y]);
    }
  };

  const handleOverlayPointerMove = (event) => {
    if (!isIterationMode || !overlayMode) {
      return;
    }
    const bounds = iterationPreviewRef.current?.getBoundingClientRect();
    const point = getPointerFromEvent(event, bounds, panOffset, zoomLevel);
    if (!point) {
      return;
    }
    if (overlayMode === "note") {
      if (!isDrawing || !draftCircle) {
        return;
      }
      const radius = Math.hypot(
        point.x - draftCircle.startX,
        point.y - draftCircle.startY
      );
      setDraftCircle((current) =>
        current
          ? {
              ...current,
              radius,
            }
          : current
      );
      return;
    }
    if (overlayMode === "pencil") {
      if (!isPencilDrawing) {
        return;
      }
      setPencilPoints((current) => {
        if (current.length < 2) {
          return [point.x, point.y];
        }
        const lastX = current[current.length - 2];
        const lastY = current[current.length - 1];
        const distance = Math.hypot(point.x - lastX, point.y - lastY);
        if (distance < 3) {
          return current;
        }
        return [...current, point.x, point.y];
      });
    }
  };

  const handleOverlayPointerEnd = () => {
    if (!isIterationMode || !overlayMode) {
      return;
    }
    if (overlayMode === "note") {
      if (!isDrawing || !draftCircle) {
        setIsDrawing(false);
        setDraftCircle(null);
        return;
      }
      const radius = Math.max(draftCircle.radius, NOTE_RADIUS_MIN);
      if (!radius) {
        setIsDrawing(false);
        setDraftCircle(null);
        return;
      }
      scheduleHistoryCommit("Annotation");
      const nextAnnotation = {
        id: `note-${Date.now()}`,
        x: draftCircle.x,
        y: draftCircle.y,
        radius,
        note: "",
      };
      setAnnotations((current) => [...current, nextAnnotation]);
      setPendingAnnotation(nextAnnotation);
      setNoteDraft("");
      setDraftCircle(null);
      setIsDrawing(false);
      return;
    }
    if (overlayMode === "pencil") {
      if (!isPencilDrawing) {
        return;
      }
      setIsPencilDrawing(false);
      const points = pencilPoints;
      setPencilPoints([]);
      if (points.length < 6) {
        return;
      }
      const polygon = [];
      for (let i = 0; i < points.length; i += 2) {
        polygon.push({ x: points[i], y: points[i + 1] });
      }
      const entries = Object.values(baseLayout);
      if (!entries.length) {
        return;
      }
      const selected = entries
        .filter((entry) => {
          const transform = normalizeTransform(elementTransforms[entry.id]);
          const center = {
            x:
              entry.base.x +
              transform.x +
              (entry.base.width * transform.scaleX) / 2,
            y:
              entry.base.y +
              transform.y +
              (entry.base.height * transform.scaleY) / 2,
          };
          return isPointInPolygon(center, polygon);
        })
        .map((entry) => entry.id)
        .filter((id) => !isLayerHidden(id) && !isLayerDeleted(id));
      updateSelectedElements(selected);
    }
  };

  const handleSaveNote = () => {
    if (!pendingAnnotation) {
      return;
    }
    scheduleHistoryCommit("Annotation");
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === pendingAnnotation.id
          ? { ...annotation, note: noteDraft.trim() }
          : annotation
      )
    );
    setPendingAnnotation(null);
    setNoteDraft("");
  };

  const handleCancelNote = () => {
    if (!pendingAnnotation) {
      return;
    }
    scheduleHistoryCommit("Annotation");
    setAnnotations((current) =>
      current.filter((annotation) => annotation.id !== pendingAnnotation.id)
    );
    setPendingAnnotation(null);
    setNoteDraft("");
  };

  return {
    state: {
      isDrawing,
      draftCircle,
      pendingAnnotation,
      noteDraft,
      annotations,
      pencilPoints,
      isPencilDrawing,
    },
    actions: {
      setNoteDraft,
      setAnnotations,
      setPendingAnnotation,
      handleOverlayPointerDown,
      handleOverlayPointerMove,
      handleOverlayPointerEnd,
      handleSaveNote,
      handleCancelNote,
    },
  };
}
