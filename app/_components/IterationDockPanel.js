"use client";

import { useRef } from "react";

const DEFAULT_MAX_HEIGHT = 520;

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

export default function IterationDockPanel({
  height,
  minHeight = 120,
  maxHeight = DEFAULT_MAX_HEIGHT,
  onResize,
  children,
}) {
  const panelRef = useRef(null);
  const resizeStateRef = useRef(null);

  const handleResizeStart = (event) => {
    if (!onResize) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const startHeight =
      panelRef.current?.getBoundingClientRect().height ?? height ?? minHeight;
    resizeStateRef.current = {
      startY: event.clientY,
      startHeight,
    };
    const handleResizeMove = (moveEvent) => {
      const state = resizeStateRef.current;
      if (!state) {
        return;
      }
      const delta = moveEvent.clientY - state.startY;
      const nextHeight = clampValue(
        state.startHeight + delta,
        minHeight,
        maxHeight
      );
      onResize(nextHeight);
    };
    const handleResizeEnd = () => {
      resizeStateRef.current = null;
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeEnd);
    };
    window.addEventListener("pointermove", handleResizeMove);
    window.addEventListener("pointerup", handleResizeEnd);
  };

  return (
    <div
      className="imageflow-dock-panel"
      ref={panelRef}
      style={height ? { height: `${height}px` } : undefined}
    >
      {children}
      <div
        className="imageflow-dock-panel-resizer"
        onPointerDown={handleResizeStart}
        role="separator"
        aria-label="Resize panel height"
      />
    </div>
  );
}
