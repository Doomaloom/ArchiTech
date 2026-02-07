"use client";

import { useMemo } from "react";

export default function IterationOverlayCanvas({
  width,
  height,
  overlayMode,
  annotations,
  draftCircle,
  pencilPoints,
  isPencilDrawing,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const pencilPointsAttr = useMemo(() => {
    if (!Array.isArray(pencilPoints) || !pencilPoints.length) {
      return "";
    }
    const pairs = [];
    for (let index = 0; index < pencilPoints.length; index += 2) {
      const x = pencilPoints[index];
      const y = pencilPoints[index + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        continue;
      }
      pairs.push(`${x},${y}`);
    }
    return pairs.join(" ");
  }, [pencilPoints]);

  return (
    <svg
      width={safeWidth}
      height={safeHeight}
      viewBox={`0 0 ${safeWidth} ${safeHeight}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onPointerCancel={onPointerEnd}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: "none",
        pointerEvents: overlayMode ? "auto" : "none",
      }}
    >
      <rect
        x="0"
        y="0"
        width={safeWidth}
        height={safeHeight}
        fill="transparent"
        style={{ pointerEvents: overlayMode ? "auto" : "none" }}
      />
      <g style={{ pointerEvents: "none" }}>
        {annotations.map((annotation) => (
          <circle
            key={annotation.id}
            cx={annotation.x}
            cy={annotation.y}
            r={annotation.radius}
            stroke="#f97316"
            strokeWidth="2"
            fill="none"
          />
        ))}
        {annotations
          .filter((annotation) => annotation.note)
          .map((annotation) => (
            <text
              key={`${annotation.id}-text`}
              x={annotation.x + annotation.radius + 10}
              y={annotation.y - annotation.radius + 14}
              fill="#0f172a"
              fontSize="13"
              fontFamily="system-ui, sans-serif"
            >
              {annotation.note}
            </text>
          ))}
        {draftCircle ? (
          <circle
            cx={draftCircle.x}
            cy={draftCircle.y}
            r={draftCircle.radius}
            stroke="#f97316"
            strokeWidth="2"
            strokeDasharray="6 4"
            fill="none"
          />
        ) : null}
        {pencilPointsAttr ? (
          <polyline
            points={pencilPointsAttr}
            stroke="#0f766e"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill={isPencilDrawing ? "rgba(15, 118, 110, 0.15)" : "transparent"}
          />
        ) : null}
      </g>
    </svg>
  );
}
