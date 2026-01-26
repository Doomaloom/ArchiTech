import { averageDistance, median } from "../../../_lib/geometry";

import { NOTE_PANEL_SIZE } from "./constants";

export const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

export const getPointerFromEvent = (
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

export const getTopLevelSelection = (ids, layout) => {
  if (!ids?.length || !layout) {
    return ids ?? [];
  }
  const selected = new Set(ids);
  return ids.filter((id) => {
    let parentId = layout[id]?.parentId;
    while (parentId && parentId !== "root") {
      if (selected.has(parentId)) {
        return false;
      }
      parentId = layout[parentId]?.parentId;
    }
    return true;
  });
};

export const deriveLayoutAxis = (positions) => {
  if (positions.length < 2) {
    return "single";
  }
  const xs = positions.map((point) => point.x);
  const ys = positions.map((point) => point.y);
  const xMedian = median(xs);
  const yMedian = median(ys);
  const xDeviation = averageDistance(xs, xMedian);
  const yDeviation = averageDistance(ys, yMedian);
  if (!xDeviation && !yDeviation) {
    return "single";
  }
  const ratio =
    Math.min(xDeviation, yDeviation) / Math.max(xDeviation, yDeviation);
  if (ratio > 0.6) {
    return "grid";
  }
  return xDeviation < yDeviation ? "column" : "row";
};

export const getNotePosition = ({ pendingAnnotation, stageSize, zoomLevel, panOffset }) => {
  if (!pendingAnnotation) {
    return null;
  }
  const padding = 12;
  const maxLeft = Math.max(
    padding,
    stageSize.width - NOTE_PANEL_SIZE.width - padding
  );
  const maxTop = Math.max(
    padding,
    stageSize.height - NOTE_PANEL_SIZE.height - padding
  );
  const scaledRadius = pendingAnnotation.radius * zoomLevel;
  const screenX = pendingAnnotation.x * zoomLevel + panOffset.x;
  const screenY = pendingAnnotation.y * zoomLevel + panOffset.y;
  const left = clampValue(
    screenX + scaledRadius + padding,
    padding,
    maxLeft
  );
  const top = clampValue(screenY - scaledRadius, padding, maxTop);
  return { left, top };
};
