import { getSharedAudioContext } from './sampleBank';

// Song playback used to hand every note to its own setTimeout up front. JS
// timers only promise "not before" — under render load they fire late, and by
// a different amount each time. Rhythm is the *difference* between onsets, so
// variable lateness is what makes a chart stop feeling like the song even when
// every pitch is right.
//
// Instead: one modest interval looks at the audio clock, and hands the engine
// the notes falling inside a short lookahead window along with the exact
// context time each must sound. The audio thread owns the onsets from there,
// so a stuttering JS thread can no longer smear the beat. (Standard Web Audio
// "tale of two clocks" scheduling.)

export type TimedEvent = { atMs: number };

const TICK_MS = 25;
/** How far ahead of the audio clock notes are handed to the engine. */
const LOOKAHEAD_MS = 120;
/** Silence after the final onset before the session is considered over. */
const DEFAULT_TAIL_MS = 1500;

export type SongSchedulerOptions<T extends TimedEvent> = {
  events: T[];
  /** Tempo multiplier — 1 plays at the written tempo, 1.25 is faster. */
  rate?: number;
  /**
   * Song-time clock (ms) to follow instead of the scheduler's own. Used when a
   * backing track owns the timeline, so the chart stays locked to the mix
   * rather than to its own start moment.
   */
  getElapsedMs?: () => number;
  /**
   * Sound the event. `atContextTime` is the absolute audio-context time (in
   * seconds) the note must sound at — pass it straight through to the engine.
   */
  onEvent: (event: T, index: number, atContextTime: number) => void;
  /**
   * The chart has advanced to `index` (last event whose onset has passed).
   * Runs on the JS clock and is coalesced to at most one call per tick, so
   * driving React state from here cannot back up the audio scheduling.
   */
  onAdvance?: (index: number, event: T) => void;
  /** Fires once, `tailMs` after the final onset. */
  onDone?: () => void;
  tailMs?: number;
};

export type SongSchedulerHandle = {
  stop: () => void;
  /** Current position on the song timeline (ms). */
  getElapsedMs: () => number;
};

export function startSongScheduler<T extends TimedEvent>(
  options: SongSchedulerOptions<T>,
): SongSchedulerHandle {
  const context = getSharedAudioContext();
  const rate = options.rate && options.rate > 0 ? options.rate : 1;
  const tailMs = options.tailMs ?? DEFAULT_TAIL_MS;
  const events = [...options.events].sort((a, b) => a.atMs - b.atMs);
  const externalClock = options.getElapsedMs;

  const startContextTime = context.currentTime;
  const lastAtMs = events.length > 0 ? events[events.length - 1].atMs : 0;

  /** Next event not yet handed to the engine. */
  let scheduleIndex = 0;
  /** Next event whose onset has not yet passed (drives the UI). */
  let visualIndex = 0;
  let finished = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const elapsedMs = (): number => {
    if (externalClock) {
      return externalClock();
    }
    return (context.currentTime - startContextTime) * 1000 * rate;
  };

  const stop = (): void => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const tick = (): void => {
    const nowMs = elapsedMs();

    while (
      scheduleIndex < events.length &&
      events[scheduleIndex].atMs <= nowMs + LOOKAHEAD_MS
    ) {
      const event = events[scheduleIndex];
      // Anchoring to the scheduler's own start keeps onsets exact. Following a
      // backing track means the anchor can drift, so the offset is measured
      // from the clock reading we just took.
      const atContextTime = externalClock
        ? context.currentTime + Math.max(0, event.atMs - nowMs) / rate / 1000
        : startContextTime + event.atMs / rate / 1000;

      options.onEvent(event, scheduleIndex, atContextTime);
      scheduleIndex += 1;
    }

    // One UI update per tick regardless of how many onsets were crossed —
    // dense passages must not turn into a burst of re-renders.
    let advanced = -1;
    while (visualIndex < events.length && events[visualIndex].atMs <= nowMs) {
      advanced = visualIndex;
      visualIndex += 1;
    }
    if (advanced >= 0) {
      options.onAdvance?.(advanced, events[advanced]);
    }

    if (!finished && scheduleIndex >= events.length && nowMs >= lastAtMs + tailMs) {
      finished = true;
      stop();
      options.onDone?.();
    }
  };

  timer = setInterval(tick, TICK_MS);
  // Run one pass immediately so a note written at 0 ms is not a tick late.
  tick();

  return { stop, getElapsedMs: elapsedMs };
}
