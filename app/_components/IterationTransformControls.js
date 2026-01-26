import { useLayoutEffect, useRef } from "react";

const getSelectionBounds = (previewEl, siteEl, ids) => {
  if (!previewEl || !siteEl || !ids.length) {
    return null;
  }
  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  ids.forEach((id) => {
    const element = siteEl.querySelector(`[data-gem-id="${id}"]`);
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    if (rect.left < minLeft) {
      minLeft = rect.left;
    }
    if (rect.top < minTop) {
      minTop = rect.top;
    }
    if (rect.right > maxRight) {
      maxRight = rect.right;
    }
    if (rect.bottom > maxBottom) {
      maxBottom = rect.bottom;
    }
  });

  if (!Number.isFinite(minLeft)) {
    return null;
  }
  const previewRect = previewEl.getBoundingClientRect();
  return {
    left: minLeft - previewRect.left,
    top: minTop - previewRect.top,
    right: maxRight - previewRect.left,
    bottom: maxBottom - previewRect.top,
  };
};

const areBoundsEqual = (current, next) => {
  if (current === next) {
    return true;
  }
  if (!current && !next) {
    return true;
  }
  if (!current || !next) {
    return false;
  }
  return (
    Math.abs(current.left - next.left) < 0.5 &&
    Math.abs(current.top - next.top) < 0.5 &&
    Math.abs(current.right - next.right) < 0.5 &&
    Math.abs(current.bottom - next.bottom) < 0.5
  );
};

const applyControlsVisibility = (element, isVisible) => {
  if (!element) {
    return;
  }
  element.style.opacity = isVisible ? "1" : "0";
  element.style.pointerEvents = isVisible ? "auto" : "none";
};

const applyControlsPosition = (element, bounds) => {
  if (!element) {
    return;
  }
  if (!bounds) {
    applyControlsVisibility(element, false);
    return;
  }
  const left = Math.max(8, bounds.left);
  const top = Math.max(8, bounds.top);
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  applyControlsVisibility(element, true);
};

export default function IterationTransformControls({
  previewRef,
  siteRef,
  selectionIds,
  isVisible,
  onUnlink,
  elementTransforms,
  zoomLevel,
  panOffset,
  stageSize,
}) {
  const controlsRef = useRef(null);
  const boundsRef = useRef(null);
  const rafRef = useRef(null);

  useLayoutEffect(() => {
    if (!isVisible) {
      boundsRef.current = null;
      applyControlsVisibility(controlsRef.current, false);
      return;
    }
    const previewEl = previewRef.current;
    const siteEl = siteRef.current;
    if (!previewEl || !siteEl || !selectionIds.length) {
      boundsRef.current = null;
      applyControlsVisibility(controlsRef.current, false);
      return;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      const nextBounds = getSelectionBounds(previewEl, siteEl, selectionIds);
      if (areBoundsEqual(boundsRef.current, nextBounds)) {
        return;
      }
      boundsRef.current = nextBounds;
      applyControlsPosition(controlsRef.current, nextBounds);
    });
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [
    elementTransforms,
    isVisible,
    panOffset,
    previewRef,
    selectionIds,
    siteRef,
    stageSize,
    zoomLevel,
  ]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="imageflow-transform-controls"
      ref={controlsRef}
      style={{ opacity: 0, pointerEvents: "none" }}
    >
      <button
        className="imageflow-transform-unlink"
        type="button"
        onClick={onUnlink}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Unlink from folder"
      >
        UNLINK
      </button>
    </div>
  );
}
