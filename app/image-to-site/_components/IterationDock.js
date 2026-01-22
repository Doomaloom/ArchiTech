import { useEffect, useRef } from "react";

const DOCK_MIN_WIDTH = 240;
const DOCK_MAX_WIDTH = 520;
const DOCK_PADDING = 12;
const DETACH_THRESHOLD = 6;

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

export default function IterationDock({
  children,
  width,
  detached,
  position,
  onResize,
  onMove,
  onDetachedChange,
  containerRef,
  title = "Panels",
}) {
  const dockRef = useRef(null);
  const resizeStateRef = useRef(null);
  const dragStateRef = useRef(null);
  const resizeHandlersRef = useRef(null);
  const dragHandlersRef = useRef(null);

  const handleResizeStart = (event) => {
    if (!onResize) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: width,
    };
    const handleResizeMove = (moveEvent) => {
      const state = resizeStateRef.current;
      if (!state || !onResize) {
        return;
      }
      const delta = state.startX - moveEvent.clientX;
      const nextWidth = clampValue(
        state.startWidth + delta,
        DOCK_MIN_WIDTH,
        DOCK_MAX_WIDTH
      );
      onResize(nextWidth);
    };
    const handleResizeEnd = () => {
      resizeStateRef.current = null;
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeEnd);
      resizeHandlersRef.current = null;
    };
    resizeHandlersRef.current = {
      handleResizeMove,
      handleResizeEnd,
    };
    window.addEventListener("pointermove", handleResizeMove);
    window.addEventListener("pointerup", handleResizeEnd);
  };

  const handleHeaderPointerDown = (event) => {
    if (!onMove || !containerRef?.current) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const dockRect = dockRef.current?.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!dockRect || !containerRect) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - dockRect.left,
      offsetY: event.clientY - dockRect.top,
      containerRect,
      mode: detached ? "dragging" : "pending",
    };
    const handleDragMove = (moveEvent) => {
      const state = dragStateRef.current;
      if (!state || !onMove) {
        return;
      }
      if (state.mode === "pending") {
        const deltaX = Math.abs(moveEvent.clientX - state.startX);
        const deltaY = Math.abs(moveEvent.clientY - state.startY);
        if (deltaX + deltaY < DETACH_THRESHOLD) {
          return;
        }
        state.mode = "dragging";
        if (!detached && onDetachedChange) {
          onDetachedChange(true);
          const nextTop = clampValue(
            dockRect.top - containerRect.top,
            DOCK_PADDING,
            Math.max(
              DOCK_PADDING,
              containerRect.height - dockRect.height - DOCK_PADDING
            )
          );
          const maxRight = Math.max(
            DOCK_PADDING,
            containerRect.width - width - DOCK_PADDING
          );
          const nextRight = clampValue(
            containerRect.right - dockRect.right,
            DOCK_PADDING,
            maxRight
          );
          onMove({ top: nextTop, right: nextRight });
        }
        state.containerRect =
          containerRef.current?.getBoundingClientRect() ?? state.containerRect;
      }
      const bounds = state.containerRect;
      const dockHeight = dockRef.current?.offsetHeight ?? 0;
      const maxLeft = Math.max(DOCK_PADDING, bounds.width - width - DOCK_PADDING);
      const maxTop = Math.max(
        DOCK_PADDING,
        bounds.height - dockHeight - DOCK_PADDING
      );
      const nextLeft = clampValue(
        moveEvent.clientX - bounds.left - state.offsetX,
        DOCK_PADDING,
        maxLeft
      );
      const nextTop = clampValue(
        moveEvent.clientY - bounds.top - state.offsetY,
        DOCK_PADDING,
        maxTop
      );
      const nextRight = bounds.width - nextLeft - width;
      onMove({
        top: nextTop,
        right: clampValue(nextRight, DOCK_PADDING, maxLeft),
      });
    };
    const handleDragEnd = () => {
      dragStateRef.current = null;
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);
      dragHandlersRef.current = null;
    };
    dragHandlersRef.current = {
      handleDragMove,
      handleDragEnd,
    };
    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
  };

  useEffect(() => {
    return () => {
      const resizeHandlers = resizeHandlersRef.current;
      if (resizeHandlers) {
        window.removeEventListener(
          "pointermove",
          resizeHandlers.handleResizeMove
        );
        window.removeEventListener(
          "pointerup",
          resizeHandlers.handleResizeEnd
        );
      }
      const dragHandlers = dragHandlersRef.current;
      if (dragHandlers) {
        window.removeEventListener("pointermove", dragHandlers.handleDragMove);
        window.removeEventListener("pointerup", dragHandlers.handleDragEnd);
      }
    };
  }, []);

  const dockStyle = detached
    ? {
        width: `${width}px`,
        top: position?.top ?? DOCK_PADDING,
        right: position?.right ?? DOCK_PADDING,
      }
    : {
        width: `${width}px`,
      };
  const canDragDock = Boolean(onMove);

  return (
    <aside
      className={`imageflow-iteration-dock${detached ? " is-detached" : ""}`}
      ref={dockRef}
      style={dockStyle}
    >
      <div
        className={`imageflow-iteration-dock-header${
          canDragDock ? " is-draggable" : ""
        }`}
        onPointerDown={handleHeaderPointerDown}
        onDoubleClick={() => {
          if (onDetachedChange) {
            onDetachedChange(!detached);
          }
        }}
      >
        <span>{title}</span>
      </div>
      <div className="imageflow-iteration-dock-body">{children}</div>
      <div
        className="imageflow-iteration-dock-resizer"
        onPointerDown={handleResizeStart}
        role="separator"
        aria-label="Resize panels"
      />
    </aside>
  );
}
