"use client";

import { useCallback, useMemo, useRef, useState } from "react";

const randomColor = () =>
  `hsl(${Math.floor(Math.random() * 360)}, 85%, 70%)`;

const createId = () =>
  crypto.randomUUID ? crypto.randomUUID() : `anno-${Date.now()}`;

const createPathAnnotation = (point, color) => ({
  id: createId(),
  color,
  type: "path",
  points: [point],
  note: "",
  imageUrl: null,
});

const createRectAnnotation = (point, color) => ({
  id: createId(),
  color,
  type: "rect",
  rect: { x: point.x, y: point.y, width: 0, height: 0 },
  note: "",
  imageUrl: null,
});

const normalizeRect = (rect) => {
  const width = rect.width;
  const height = rect.height;
  const x = width < 0 ? rect.x + width : rect.x;
  const y = height < 0 ? rect.y + height : rect.y;
  return { x, y, width: Math.abs(width), height: Math.abs(height) };
};

export default function useBuilderAnnotations() {
  const overlayRef = useRef(null);
  const [annotations, setAnnotations] = useState([]);
  const [activeDraw, setActiveDraw] = useState(null);
  const [modeActive, setModeActive] = useState(false);
  const [tool, setTool] = useState("pencil"); // "pencil" | "rect" | "clear" | "restart"
  const [pendingUploadId, setPendingUploadId] = useState(null);

  const toLocalPoint = useCallback((event) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback(
    (event) => {
      if (!modeActive || event.button !== 0) return;
      if (tool === "clear") {
        setAnnotations([]);
        setActiveDraw(null);
        setModeActive(false);
        return;
      }
      const point = toLocalPoint(event);
      if (!point) return;
      event.preventDefault();
      const color = randomColor();
      if (tool === "rect") {
        setActiveDraw(createRectAnnotation(point, color));
      } else {
        setActiveDraw(createPathAnnotation(point, color));
      }
    },
    [modeActive, toLocalPoint, tool]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!modeActive || !activeDraw) return;
      const point = toLocalPoint(event);
      if (!point) return;
      event.preventDefault();
      setActiveDraw((current) => {
        if (!current) return current;
        if (current.type === "rect") {
          return {
            ...current,
            rect: {
              ...current.rect,
              width: point.x - current.rect.x,
              height: point.y - current.rect.y,
            },
          };
        }
        return { ...current, points: [...current.points, point] };
      });
    },
    [activeDraw, modeActive, toLocalPoint]
  );

  const handlePointerUp = useCallback(() => {
    if (!activeDraw) return;
    const next =
      activeDraw.type === "rect"
        ? { ...activeDraw, rect: normalizeRect(activeDraw.rect) }
        : activeDraw;
    setAnnotations((current) => [...current, next]);
    setActiveDraw(null);
  }, [activeDraw]);

  const handleNoteChange = useCallback((id, value) => {
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === id ? { ...annotation, note: value } : annotation
      )
    );
  }, []);

  const handleImageUpload = useCallback((id, file) => {
    if (!id || !file) return;
    const url = URL.createObjectURL(file);
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === id ? { ...annotation, imageUrl: url } : annotation
      )
    );
  }, []);

  const selectTool = useCallback(
    (nextTool) => {
      if (tool === nextTool && modeActive) {
        setModeActive(false);
        setActiveDraw(null);
        return;
      }
      setTool(nextTool);
      setModeActive(true);
      setActiveDraw(null);
    },
    [modeActive, tool]
  );

  const derived = useMemo(
    () => ({
      hasAnnotations: annotations.length > 0 || !!activeDraw,
    }),
    [annotations.length, activeDraw]
  );

  return {
    state: { annotations, activeDraw, modeActive, tool },
    pendingUploadId,
    derived,
    refs: { overlayRef },
    actions: {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handleNoteChange,
      handleImageUpload,
      selectTool,
      setPendingUploadId,
    },
  };
}
