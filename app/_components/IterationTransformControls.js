import { useLayoutEffect, useState } from "react";

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
  const [bounds, setBounds] = useState(null);

  useLayoutEffect(() => {
    if (!isVisible) {
      setBounds(null);
      return;
    }
    void elementTransforms;
    void zoomLevel;
    void panOffset;
    void stageSize;
    const previewEl = previewRef.current;
    const siteEl = siteRef.current;
    const nextBounds = getSelectionBounds(previewEl, siteEl, selectionIds);
    setBounds(nextBounds);
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

  if (!isVisible || !bounds) {
    return null;
  }
  const left = Math.max(8, bounds.left);
  const top = Math.max(8, bounds.top);

  return (
    <div
      className="imageflow-transform-controls"
      style={{ left, top }}
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
