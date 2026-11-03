// How many synth voices (organ / rhodes / synth lead) are sounding right now.
//
// The piano engine ducks its synth bus by 1/sqrt(n) of this count. The count
// used to be decremented only when a voice's *scheduled* lifetime ran out —
// and an interactive held note is scheduled for ~24 s, because nobody knows
// when the finger will lift. Releasing the key faded the sound in a quarter
// second but left the note counted for the rest of those 24 s, so after eight
// taps a single sounding note came out ~9 dB down.
//
// Here every voice is counted until it actually goes silent: its natural end,
// or the moment it is stopped early (note-off, voice steal, stop-all),
// whichever comes first, and exactly once.
//
// Clock and timers are injected, so the bookkeeping is testable without the
// native audio module.

export type SynthVoiceCounterDeps = {
  /** Current audio-context time, in seconds. */
  now: () => number;
  /** Called with the new count whenever it changes. */
  onChange: (count: number) => void;
  setTimer?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
};

export type SynthVoiceCounter = {
  count: () => number;
  /**
   * Count a voice that falls silent on its own at context time `endsAt`.
   * Returns the voice's "stopping early" hook: call it with the context time
   * it now ends at (omit for "now"). Later-than-scheduled ends are ignored —
   * stopping can only ever shorten a voice.
   */
  add: (endsAt: number) => (endsAt?: number) => void;
  /** Forget every voice (engine teardown). Hooks of old voices become no-ops. */
  reset: () => void;
};

export function createSynthVoiceCounter(deps: SynthVoiceCounterDeps): SynthVoiceCounter {
  const setTimer = deps.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
  const clearTimer = deps.clearTimer ?? ((timer) => clearTimeout(timer));

  let active = 0;
  /** Bumped by reset(), so a hook from before it cannot decrement a new count. */
  let generation = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const add = (endsAt: number): ((endsAt?: number) => void) => {
    const voiceGeneration = generation;
    let counted = true;
    let scheduledEnd = Number.POSITIVE_INFINITY;
    let timer: ReturnType<typeof setTimeout> | null = null;

    active += 1;
    deps.onChange(active);

    const finish = (): void => {
      if (!counted) {
        return;
      }
      counted = false;
      if (timer !== null) {
        clearTimer(timer);
        timers.delete(timer);
        timer = null;
      }
      if (voiceGeneration !== generation) {
        return;
      }
      active = Math.max(0, active - 1);
      deps.onChange(active);
    };

    const endAt = (time?: number): void => {
      if (!counted || voiceGeneration !== generation) {
        return;
      }
      const at = time ?? deps.now();
      if (at >= scheduledEnd) {
        return;
      }
      scheduledEnd = at;
      if (timer !== null) {
        clearTimer(timer);
        timers.delete(timer);
        timer = null;
      }
      const ms = Math.max(0, (at - deps.now()) * 1000);
      if (ms === 0) {
        finish();
        return;
      }
      const handle = setTimer(() => {
        timers.delete(handle);
        timer = null;
        finish();
      }, ms);
      timer = handle;
      timers.add(handle);
    };

    endAt(endsAt);
    return endAt;
  };

  const reset = (): void => {
    for (const timer of timers) {
      clearTimer(timer);
    }
    timers.clear();
    generation += 1;
    active = 0;
  };

  return { count: () => active, add, reset };
}
