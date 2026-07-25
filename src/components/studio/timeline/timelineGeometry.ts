// Shared geometry + scale helpers for the horizontal studio timeline.

/** Fixed left column that holds per-track headers (icon, name, mute/solo). */
export const HEADER_WIDTH = 116;
/** Time ruler height above the lanes. */
export const RULER_HEIGHT = 30;
/** Height of a single track lane. */
export const LANE_HEIGHT = 74;
/** Vertical gap between lanes. */
export const LANE_GAP = 8;
/** Extra room drawn after the last clip so clips can be dragged past the end. */
export const TRAIL_MS = 5000;

/** Horizontal zoom, expressed as pixels per second. */
export const ZOOM_LEVELS = [40, 70, 120, 200] as const;
export const DEFAULT_ZOOM_INDEX = 1;

/** Minimum content window so very short projects still fill the viewport. */
export const MIN_TIMELINE_MS = 8000;

export function pxPerMsFor(pixelsPerSecond: number): number {
  return pixelsPerSecond / 1000;
}

export function laneOffsetY(index: number): number {
  return index * (LANE_HEIGHT + LANE_GAP);
}

export function lanesHeight(count: number): number {
  if (count <= 0) {
    return 0;
  }
  return count * LANE_HEIGHT + (count - 1) * LANE_GAP;
}

/** Pick a "nice" seconds interval for ruler labels at the given zoom. */
export function rulerStepSeconds(pixelsPerSecond: number): number {
  const targetPx = 74;
  const raw = targetPx / pixelsPerSecond;
  const nice = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  for (const n of nice) {
    if (n >= raw) {
      return n;
    }
  }
  return 600;
}

/** Append an alpha byte to a `#RRGGBB` hex color → `#RRGGBBAA`. */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const byte = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${byte}`;
}
