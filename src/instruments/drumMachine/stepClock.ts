export type StepClockHandle = {
  stop: () => void;
};

/** 16th-note interval in ms for a given BPM. */
export function stepIntervalMs(bpm: number): number {
  return 60_000 / Math.max(1, bpm) / 4;
}

/**
 * Looping step clock. Fires `onStep(stepIndex)` immediately for step 0, then every interval.
 * BPM, swing and step count are read on every tick, so all three change live.
 * Ticks are scheduled against an absolute timeline so callback cost and timer
 * lag don't accumulate as drift.
 *
 * Swing (0..~0.3) stretches even→odd gaps and shrinks odd→even gaps, giving
 * the classic shuffled 16th feel.
 */
export function startStepClock(
  getBpm: () => number,
  getSwing: () => number,
  getStepCount: () => number,
  onStep: (stepIndex: number) => void,
): StepClockHandle {
  let step = 0;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let nextAt = Date.now();

  const tick = () => {
    if (cancelled) {
      return;
    }
    const stepCount = Math.max(1, getStepCount());
    if (step >= stepCount) {
      step = 0;
    }
    onStep(step);
    const swing = getSwing();
    const base = stepIntervalMs(getBpm());
    // Gap that follows an even step is lengthened, after an odd step shortened.
    const interval = step % 2 === 0 ? base * (1 + swing) : base * (1 - swing);
    step = (step + 1) % stepCount;
    nextAt += interval;
    const now = Date.now();
    if (nextAt < now - interval) {
      // Fell far behind (backgrounded / blocked JS thread) — resync instead
      // of firing a burst of catch-up steps.
      nextAt = now + interval;
    }
    timer = setTimeout(tick, Math.max(0, nextAt - now));
  };

  tick();

  return {
    stop: () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
