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
  transformTargetId,
  isVisible,
  showUnlink,
  onUnlink,
  elementTransforms,
  zoomLevel,
  panOffset,
  stageSize,
  textEdits,
  scaleLock,
  onToggleScaleLock,
  onUpdateScale,
  onUpdateFontSize,
  getControlState,
}) {
  const controlsRef = useRef(null);
  const boundsRef = useRef(null);
  const rafRef = useRef(null);
  const isSingleSelection =
    isVisible && Boolean(transformTargetId);
  const boundsIds = transformTargetId ? [transformTargetId] : selectionIds;
  const target = isSingleSelection
    ? siteRef.current?.querySelector(`[data-gem-id="${transformTargetId}"]`)
    : null;
  const controlState =
    isSingleSelection && getControlState
      ? getControlState({
          id: transformTargetId,
          target,
          textStyles: textEdits?.[transformTargetId]?.styles,
        })
      : null;
  const handleUnlinkPointerDown = (event) => {
    event.stopPropagation();
    event.preventDefault();
    onUnlink?.();
  };

  const handleUnlinkClick = (event) => {
    if (event.detail > 0) {
      return;
    }
    onUnlink?.();
  };

  const handleScaleChange = (axis) => (event) => {
    if (!isSingleSelection) {
      return;
    }
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) {
      return;
    }
    const scaleValue = value / 100;
    const next =
      axis === "x" ? { scaleX: scaleValue } : { scaleY: scaleValue };
    if (scaleLock) {
      next.scaleX = scaleValue;
      next.scaleY = scaleValue;
    }
    onUpdateScale?.(transformTargetId, next, target ?? null);
  };

  const handleFontSizeChange = (event) => {
    if (!isSingleSelection) {
      return;
    }
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) {
      return;
    }
    onUpdateFontSize?.(transformTargetId, value);
  };

  const handleToggleScaleLock = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    onToggleScaleLock?.(!scaleLock);
  };

  const handleToggleScaleLockKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    onToggleScaleLock?.(!scaleLock);
  };

  useLayoutEffect(() => {
    if (!isVisible) {
      boundsRef.current = null;
      applyControlsVisibility(controlsRef.current, false);
      return;
    }
    const previewEl = previewRef.current;
    const siteEl = siteRef.current;
    if (!previewEl || !siteEl || !boundsIds.length) {
      boundsRef.current = null;
      applyControlsVisibility(controlsRef.current, false);
      return;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      const nextBounds = getSelectionBounds(previewEl, siteEl, boundsIds);
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
    transformTargetId,
    siteRef,
    stageSize,
    textEdits,
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
      onPointerDown={(event) => event.stopPropagation()}
    >
      {controlState ? (
        <div className="imageflow-transform-group">
          {controlState.kind === "object" ? (
            <>
              <span className="imageflow-transform-label">Scale</span>
              <div className="imageflow-transform-inputs">
                <label className="imageflow-transform-field">
                  <span>W%</span>
                  <input
                    className="imageflow-transform-input"
                    type="number"
                    step="0.1"
                    min="1"
                    max="800"
                    value={controlState.scaleXPercent}
                    onChange={handleScaleChange("x")}
                  />
                </label>
                <label className="imageflow-transform-field">
                  <span>H%</span>
                  <input
                    className="imageflow-transform-input"
                    type="number"
                    step="0.1"
                    min="1"
                    max="800"
                    value={controlState.scaleYPercent}
                    onChange={handleScaleChange("y")}
                  />
                </label>
              </div>
              <button
                className={`imageflow-transform-lock${
                  scaleLock ? " is-locked" : ""
                }`}
                type="button"
                onPointerDown={handleToggleScaleLock}
                onKeyDown={handleToggleScaleLockKeyDown}
                aria-pressed={Boolean(scaleLock)}
                aria-label={scaleLock ? "Unlock uniform scaling" : "Lock uniform scaling"}
                title={scaleLock ? "Unlock uniform scaling" : "Lock uniform scaling"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect
                    x="5"
                    y="11"
                    width="14"
                    height="9"
                    rx="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  {scaleLock ? (
                    <path
                      d="M8 11V8a4 4 0 018 0v3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  ) : (
                    <path
                      d="M9 11V8a3.5 3.5 0 017 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </button>
            </>
          ) : (
            <>
              <span className="imageflow-transform-label">Font</span>
              <label className="imageflow-transform-field">
                <input
                  className="imageflow-transform-input"
                  type="number"
                  min="6"
                  max="200"
                  value={controlState.fontSize ?? ""}
                  onChange={handleFontSizeChange}
                />
                <span className="imageflow-transform-unit">px</span>
              </label>
            </>
          )}
        </div>
      ) : null}
      {showUnlink ? (
        <button
          className="imageflow-transform-unlink"
          type="button"
          onClick={handleUnlinkClick}
          onPointerDown={handleUnlinkPointerDown}
          aria-label="Unlink from folder"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 15l-2 2a3 3 0 01-4.2-4.2l2-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 9l2-2a3 3 0 114.2 4.2l-2 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 8l8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
