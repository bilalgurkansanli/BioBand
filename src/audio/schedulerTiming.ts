// The arithmetic behind songScheduler.ts and the players' loops, kept free of
// the native audio module so it can be unit-tested.

/** How often the scheduler wakes up to look ahead. */
export const SCHEDULER_TICK_MS = 25;

/**
 * How far ahead of the audio clock notes are handed to the engine, in
 * material (song-time) milliseconds.
 */
export const SCHEDULER_LOOKAHEAD_MS = 120;

/**
 * An onset already this far in the past (real time) when the scheduler gets
 * to it is dropped instead of played.
 *
 * Normally nothing is ever late: notes are queued a lookahead early. Lateness
 * means the JS thread stalled for longer than the lookahead — a heavy render,
 * or the app coming back from the background. The engines clamp a past start
 * time to "now", so without this every note missed during the stall sounded
 * at once: a burst of a whole bar's worth of hits. A slightly late note is
 * still played (a small flam beats a hole); anything later is skipped and the
 * song carries on in time.
 */
export const STALE_EVENT_MS = 50;

/** Extra ring after the final note of a non-looping pass before teardown. */
const END_GRACE_MS = 50;

/**
 * Shortest pass a loop may have. Below it the next pass would be handed over
 * before this one even started — at length zero, endlessly in one tick.
 */
export const MIN_LOOP_PASS_MS = 250;

/**
 * True when an event at `eventAtMs` (material time) is too far behind the
 * scheduler's position `nowMs` to still be played. `rate` converts material
 * time to real time (2 = twice as fast).
 */
export function isStaleEvent(eventAtMs: number, nowMs: number, rate = 1): boolean {
  const safeRate = rate > 0 ? rate : 1;
  return (nowMs - eventAtMs) / safeRate > STALE_EVENT_MS;
}

/**
 * `tailMs` for one pass of a playback that ends `remainingMs` (material time)
 * after the pass starts, whose last event sits at `lastAtMs`.
 *
 * A pass that will loop hands over one lookahead *before* its end, so the next
 * pass — anchored to the exact end time on the audio clock — has its downbeat
 * queued before it is due. Waiting for the end instead started every pass a
 * tick late and from a fresh clock reading, so a loop drifted a little further
 * out of time on every lap.
 */
export function passTailMs(remainingMs: number, lastAtMs: number, looping: boolean): number {
  const toEnd = Math.max(remainingMs - lastAtMs, 0);
  return looping ? toEnd - SCHEDULER_LOOKAHEAD_MS : toEnd + END_GRACE_MS;
}

/**
 * Audio-context time a pass ends at — and the next pass begins at: its start
 * plus its length in real time.
 */
export function passEndContextTime(
  passStartContextTime: number,
  remainingMs: number,
  rate = 1,
): number {
  const safeRate = rate > 0 ? rate : 1;
  return passStartContextTime + Math.max(0, remainingMs) / safeRate / 1000;
}
