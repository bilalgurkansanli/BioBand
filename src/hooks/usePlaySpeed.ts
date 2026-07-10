import { useCallback, useEffect, useRef, useState } from 'react';

const WINDOW_MS = 1500;
const IDLE_DECAY_MS = 400;
const MAX_NOTES_PER_SEC = 8;
const TICK_MS = 80;

/**
 * Rolling play-speed from note onsets (notes/sec over the last 1.5s).
 * No pressure sensor — timing only.
 */
export function usePlaySpeed() {
  const onsetsRef = useRef<number[]>([]);
  const [notesPerSec, setNotesPerSec] = useState(0);

  const recompute = useCallback(() => {
    const now = Date.now();
    onsetsRef.current = onsetsRef.current.filter((t) => now - t <= WINDOW_MS);
    const count = onsetsRef.current.length;
    if (count === 0) {
      setNotesPerSec(0);
      return;
    }
    const newest = onsetsRef.current[onsetsRef.current.length - 1];
    if (now - newest > IDLE_DECAY_MS) {
      setNotesPerSec(0);
      return;
    }
    const rate = (count / WINDOW_MS) * 1000;
    setNotesPerSec(Math.min(MAX_NOTES_PER_SEC, rate));
  }, []);

  const recordNoteOn = useCallback(() => {
    onsetsRef.current.push(Date.now());
    recompute();
  }, [recompute]);

  useEffect(() => {
    const id = setInterval(recompute, TICK_MS);
    return () => clearInterval(id);
  }, [recompute]);

  return { notesPerSec, recordNoteOn, maxNotesPerSec: MAX_NOTES_PER_SEC };
}
