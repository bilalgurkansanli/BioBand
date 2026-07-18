import { STEP_COUNT } from './drumMachineRows';

export type StepClockHandle = {
  stop: () => void;
};

/** 16th-note interval in ms for a given BPM. */
export function stepIntervalMs(bpm: number): number {
  return 60_000 / Math.max(1, bpm) / 4;
}

/**
 * Looping step clock. Fires `onStep(stepIndex)` immediately for step 0, then every interval.
 */
export function startStepClock(
  bpm: number,
  onStep: (stepIndex: number) => void,
): StepClockHandle {
  let step = 0;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tick = () => {
    if (cancelled) {
      return;
    }
    onStep(step);
    step = (step + 1) % STEP_COUNT;
    timer = setTimeout(tick, stepIntervalMs(bpm));
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
