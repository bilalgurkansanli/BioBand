/**
 * Pluck dynamics: 0 = soft finger, 1 = hard pick.
 * Mapped from touch Y within a string row (top soft → bottom hard).
 */

export const GUITAR_VELOCITY_DEFAULT = 0.72;

/** Clamp to 0..1. */
export function clampGuitarVelocity(value: number): number {
  if (!Number.isFinite(value)) {
    return GUITAR_VELOCITY_DEFAULT;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * Y within one string band (0 at top edge → 1 at bottom).
 * Soft near the upper edge (finger), hard near the lower edge (pick).
 */
export function guitarVelocityFromStringLocalY(localY: number): number {
  const t = clampGuitarVelocity(localY);
  // Ease slightly so the middle of the string feels like a normal pluck.
  return t * t * (3 - 2 * t);
}

/** Multiply base string gain by dynamics (soft ≈ 0.48×, hard ≈ 1.28×). */
export function guitarGainScaleForVelocity(velocity: number): number {
  const v = clampGuitarVelocity(velocity);
  return 0.48 + v * 0.8;
}

/** Slightly snappier attack on hard picks. */
export function guitarAttackSecondsForVelocity(
  velocity: number,
  shortTail: boolean,
): number {
  if (shortTail) {
    return 0.004;
  }
  const v = clampGuitarVelocity(velocity);
  return 0.0045 - v * 0.0025;
}
