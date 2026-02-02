export const DEFAULT_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 };
export const NOTE_RADIUS_MIN = 10;
export const NOTE_PANEL_SIZE = { width: 240, height: 140 };
export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.2;
export const HISTORY_LIMIT = 60;
export const HISTORY_DEBOUNCE_MS = 320;
export const NUDGE_STEP = 1;
export const NUDGE_STEP_LARGE = 10;
export const GUIDE_COLORS = ["#f97316", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b"];

export const normalizeTransform = (transform) => ({
  x: transform?.x ?? 0,
  y: transform?.y ?? 0,
  scaleX: transform?.scaleX ?? 1,
  scaleY: transform?.scaleY ?? 1,
  rotate: transform?.rotate ?? 0,
});

export const isDefaultTransform = (transform) =>
  transform.x === 0 &&
  transform.y === 0 &&
  transform.scaleX === 1 &&
  transform.scaleY === 1 &&
  transform.rotate === 0;
