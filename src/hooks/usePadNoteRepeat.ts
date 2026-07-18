import { useCallback, useEffect, useRef } from 'react';

import type { PadSoundId } from '../instruments/pads/padsSounds';

export type NoteRepeatRate = 'eighth' | 'sixteenth';

export function noteRepeatIntervalMs(bpm: number, rate: NoteRepeatRate): number {
  const safeBpm = Math.max(40, Math.min(200, bpm || 100));
  const divisions = rate === 'sixteenth' ? 4 : 2;
  return 60_000 / safeBpm / divisions;
}

/**
 * Rolls held pads at the metronome BPM (1/8 or 1/16).
 * First hit is fired by the touch layer; this only schedules repeats.
 */
export function usePadNoteRepeat(
  enabled: boolean,
  rate: NoteRepeatRate,
  bpm: number,
  onRepeat: (id: PadSoundId) => void,
) {
  const timersRef = useRef<Map<PadSoundId, ReturnType<typeof setInterval>>>(new Map());
  const onRepeatRef = useRef(onRepeat);
  onRepeatRef.current = onRepeat;
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const clearAll = useCallback(() => {
    for (const timer of timersRef.current.values()) {
      clearInterval(timer);
    }
    timersRef.current.clear();
  }, []);

  const stopRoll = useCallback((padId: PadSoundId) => {
    const timer = timersRef.current.get(padId);
    if (!timer) {
      return;
    }
    clearInterval(timer);
    timersRef.current.delete(padId);
  }, []);

  const startRoll = useCallback((padId: PadSoundId) => {
    if (!enabledRef.current) {
      return;
    }
    if (timersRef.current.has(padId)) {
      return;
    }
    const ms = noteRepeatIntervalMs(bpmRef.current, rateRef.current);
    const timer = setInterval(() => {
      if (!enabledRef.current) {
        return;
      }
      onRepeatRef.current(padId);
    }, ms);
    timersRef.current.set(padId, timer);
  }, []);

  /** Sync rolling set with currently held pads. */
  const syncHeldPads = useCallback(
    (held: ReadonlySet<PadSoundId>) => {
      if (!enabledRef.current) {
        clearAll();
        return;
      }
      for (const padId of held) {
        startRoll(padId);
      }
      for (const padId of [...timersRef.current.keys()]) {
        if (!held.has(padId)) {
          stopRoll(padId);
        }
      }
    },
    [clearAll, startRoll, stopRoll],
  );

  // Rate / BPM / enable changes: restart active rolls with new interval.
  useEffect(() => {
    if (!enabled) {
      clearAll();
      return;
    }
    const active = [...timersRef.current.keys()];
    clearAll();
    for (const padId of active) {
      startRoll(padId);
    }
  }, [enabled, rate, bpm, clearAll, startRoll]);

  useEffect(() => () => clearAll(), [clearAll]);

  return { syncHeldPads, clearAll };
}
