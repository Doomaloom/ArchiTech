export const roundValue = (value) => Math.round(value * 10) / 10;

export const median = (values) => {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
};

export const averageDistance = (values, anchor) => {
  if (!values.length) {
    return 0;
  }
  return (
    values.reduce((sum, value) => sum + Math.abs(value - anchor), 0) /
    values.length
  );
};

export const isPointInPolygon = (point, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
};

export const buildTransformString = (transform) =>
  `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${transform.rotate}deg) scale(${transform.scaleX}, ${transform.scaleY})`;
