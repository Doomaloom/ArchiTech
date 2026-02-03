"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function BuilderParamSlider({
  value = 50,
  min = 0,
  max = 100,
  onChange,
  label = "Creativity",
}) {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalValue, setInternalValue] = useState(value);

  const clamp = useCallback(
    (next) => Math.min(Math.max(next, min), max),
    [min, max]
  );

  useEffect(() => {
    setInternalValue((current) =>
      current === value ? current : clamp(value)
    );
  }, [value, clamp]);

  const percent = useMemo(() => {
    const range = max - min || 1;
    return ((clamp(internalValue) - min) / range) * 100;
  }, [clamp, internalValue, min, max]);

  const descriptor = useMemo(() => {
    const val = clamp(internalValue);
    if (val < 25) return "Obey";
    if (val < 50) return "Stable";
    if (val < 75) return "Bold";
    return "Free";
  }, [clamp, internalValue]);

  const handlePointer = useCallback(
    (clientY) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const y = clientY - rect.top;
      const ratio = 1 - Math.min(Math.max(y / rect.height, 0), 1);
      const next = clamp(min + ratio * (max - min));
      const rounded = Math.round(next);
      setInternalValue(rounded);
      onChange?.(rounded);
    },
    [clamp, max, min, onChange]
  );

  const handlePointerDown = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        event.target.setPointerCapture?.(event.pointerId);
      } catch {
        // ignore if pointer capture unsupported
      }
      setIsDragging(true);
      handlePointer(event.clientY);
    },
    [handlePointer]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!isDragging) return;
      event.preventDefault();
      handlePointer(event.clientY);
    },
    [handlePointer, isDragging]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) return undefined;
    const handleMove = (event) => handlePointer(event.clientY);
    const handleUp = () => setIsDragging(false);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [handlePointer, isDragging]);

  return (
    <div className="builder-param-slider" aria-label={label}>
      <div
        className="builder-param-track"
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(clamp(internalValue))}
        aria-orientation="vertical"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowRight") {
            event.preventDefault();
            const next = clamp(internalValue + 1);
            setInternalValue(next);
            onChange?.(next);
          } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
            event.preventDefault();
            const next = clamp(internalValue - 1);
            setInternalValue(next);
            onChange?.(next);
          } else if (event.key === "Home") {
            event.preventDefault();
            setInternalValue(min);
            onChange?.(min);
          } else if (event.key === "End") {
            event.preventDefault();
            setInternalValue(max);
            onChange?.(max);
          }
        }}
      >
        <div className="builder-param-track-line" />
        <div
          className="builder-param-thumb"
          style={{ left: "50%", bottom: `${percent}%` }}
          onPointerDown={handlePointerDown}
        />
      </div>
      <span className="builder-param-label">{descriptor || label}</span>
      <span className="builder-param-value">{Math.round(internalValue)}%</span>
    </div>
  );
}
