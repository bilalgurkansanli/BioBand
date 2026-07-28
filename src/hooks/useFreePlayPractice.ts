import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';

import { addPracticeMs } from '../storage/profileProgressStorage';
import type { InstrumentId } from '../types/recording';

/**
 * Counts time spent actually playing an instrument, outside Tutorial Mode.
 *
 * Practice time used to come only from finishing a play-along or saving a
 * recording, so twenty minutes of playing the piano for its own sake earned
 * nothing: no minutes, no streak, no progress toward a badge. The profile
 * reported someone who had never touched the app.
 *
 * What is counted is the gap *between* notes, not time on the screen. Leaving
 * the piano open on a desk is not practice, and neither is the ten minutes
 * after someone wandered off — so a gap longer than the idle window contributes
 * nothing, and the next note simply starts a new span.
 */

/**
 * The longest silence still counted as playing. Long enough to cover reading
 * the next bar or repositioning a hand; short enough that a forgotten screen
 * stops earning almost immediately.
 */
const IDLE_MS = 20_000;

/**
 * How often the accumulated time is written out. Every note would mean a
 * storage write per keypress; only on leaving would lose the session to a
 * crash or a force-quit.
 */
const FLUSH_MS = 30_000;

export function useFreePlayPractice(instrument: InstrumentId) {
  const pendingRef = useRef(0);
  const lastNoteAtRef = useRef(0);

  const flush = useCallback(() => {
    const pending = Math.round(pendingRef.current);
    pendingRef.current = 0;
    if (pending > 0) {
      // Fire and forget: practice credit must never delay a note or surface an
      // error over an instrument someone is in the middle of playing.
      void addPracticeMs(instrument, pending).catch(() => {});
    }
  }, [instrument]);

  const notePlayed = useCallback(() => {
    const now = Date.now();
    const since = now - lastNoteAtRef.current;
    // The first note of a span has nothing before it to measure, and a gap
    // past the idle window is a break rather than playing.
    if (lastNoteAtRef.current > 0 && since > 0 && since <= IDLE_MS) {
      pendingRef.current += since;
    }
    lastNoteAtRef.current = now;
  }, []);

  useEffect(() => {
    const timer = setInterval(flush, FLUSH_MS);
    return () => {
      clearInterval(timer);
      flush();
    };
  }, [flush]);

  // Leaving the screen ends the span: coming back must not bill the time spent
  // away as though the last note had just been played.
  useFocusEffect(
    useCallback(() => {
      return () => {
        flush();
        lastNoteAtRef.current = 0;
      };
    }, [flush]),
  );

  return { notePlayed };
}
