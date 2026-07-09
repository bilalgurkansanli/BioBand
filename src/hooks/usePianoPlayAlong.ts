import { useCallback, useEffect, useRef, useState } from 'react';

import type { NoteId } from '../instruments/piano/pianoNotes';
import { getSongById, PIANO_SONGS } from '../instruments/piano/songs/catalog';
import type { SongDefinition } from '../instruments/piano/songs/types';

export type SupportLevel = 'guided' | 'medium' | 'free';

export type PlayAlongPhase =
  | 'idle'
  | 'pickSong'
  | 'pickLevel'
  | 'countdown'
  | 'demo'
  | 'playing'
  | 'results';

export type PlayAlongResults = {
  totalNotes: number;
  hits: number;
  /** Notes the app played for the user (unused since guided became a demo). */
  autos: number;
  misses: number;
  wrongPresses: number;
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
};

export type PlayAlongProgress = {
  resolved: number;
  total: number;
  hits: number;
};

// A press counts as a hit when it lands within this window around the note's time.
const HIT_WINDOW_MS = 350;
const TICK_MS = 60;
const COUNTDOWN_START = 3;
const COUNTDOWN_STEP_MS = 800;
const RESULTS_DELAY_MS = 700;

function computeStars(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy >= 0.9) {
    return 3;
  }
  if (accuracy >= 0.7) {
    return 2;
  }
  if (accuracy >= 0.45) {
    return 1;
  }
  return 0;
}

export function usePianoPlayAlong(playNote: (noteId: NoteId) => void) {
  const [phase, setPhase] = useState<PlayAlongPhase>('idle');
  const [selectedSong, setSelectedSong] = useState<SongDefinition | null>(null);
  const [level, setLevel] = useState<SupportLevel>('guided');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START);
  const [guideNoteId, setGuideNoteId] = useState<NoteId | null>(null);
  const [progress, setProgress] = useState<PlayAlongProgress>({
    resolved: 0,
    total: 0,
    hits: 0,
  });
  const [results, setResults] = useState<PlayAlongResults | null>(null);

  const songRef = useRef<SongDefinition | null>(null);
  const levelRef = useRef<SupportLevel>('guided');
  const phaseRef = useRef<PlayAlongPhase>('idle');
  const startTimeRef = useRef(0);
  const pointerRef = useRef(0);
  const statsRef = useRef({ hits: 0, autos: 0, misses: 0, wrongPresses: 0 });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  phaseRef.current = phase;

  const clearTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  const updateGuide = useCallback(() => {
    const song = songRef.current;
    if (!song || levelRef.current === 'free') {
      setGuideNoteId(null);
      return;
    }
    setGuideNoteId(song.events[pointerRef.current]?.noteId ?? null);
  }, []);

  const finishSong = useCallback(() => {
    clearTimers();
    setGuideNoteId(null);

    const song = songRef.current;
    const stats = statsRef.current;
    const totalNotes = song?.events.length ?? 0;
    // Step mode always resolves every note, so score it on wrong presses
    // instead; timed (free) mode scores on hit ratio.
    const accuracy =
      totalNotes > 0
        ? levelRef.current === 'medium'
          ? totalNotes / (totalNotes + stats.wrongPresses)
          : stats.hits / totalNotes
        : 0;

    setResults({
      totalNotes,
      hits: stats.hits,
      autos: stats.autos,
      misses: stats.misses,
      wrongPresses: stats.wrongPresses,
      accuracy,
      stars: computeStars(accuracy),
    });

    const timer = setTimeout(() => {
      setPhase('results');
    }, RESULTS_DELAY_MS);
    timersRef.current.push(timer);
  }, [clearTimers]);

  const advancePointer = useCallback(() => {
    pointerRef.current += 1;
    updateGuide();

    const song = songRef.current;
    setProgress({
      resolved: pointerRef.current,
      total: song?.events.length ?? 0,
      hits: statsRef.current.hits,
    });

    if (song && pointerRef.current >= song.events.length) {
      finishSong();
    }
  }, [finishSong, updateGuide]);

  const startTick = useCallback(() => {
    tickRef.current = setInterval(() => {
      const currentSong = songRef.current;
      if (!currentSong || phaseRef.current !== 'playing') {
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;

      // Resolve every note whose hit window has fully passed without a press.
      // The clock only runs in free mode — the other levels have no timer.
      while (
        pointerRef.current < currentSong.events.length &&
        elapsed > currentSong.events[pointerRef.current].atMs + HIT_WINDOW_MS
      ) {
        statsRef.current.misses += 1;
        advancePointer();
      }
    }, TICK_MS);
  }, [advancePointer]);

  const startPlaying = useCallback(() => {
    const song = songRef.current;
    if (!song) {
      return;
    }

    startTimeRef.current = Date.now();
    pointerRef.current = 0;
    statsRef.current = { hits: 0, autos: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: song.events.length, hits: 0 });
    setPhase('playing');
    updateGuide();
    startTick();
  }, [startTick, updateGuide]);

  // "Watch first" level: the app performs the whole song, lighting each key
  // as it sounds, then returns to the level picker. No scoring.
  const startDemo = useCallback(() => {
    const song = songRef.current;
    if (!song) {
      return;
    }

    clearTimers();
    setResults(null);
    pointerRef.current = 0;
    statsRef.current = { hits: 0, autos: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: song.events.length, hits: 0 });
    setPhase('demo');
    setGuideNoteId(song.events[0]?.noteId ?? null);

    song.events.forEach((event, index) => {
      const timer = setTimeout(() => {
        playNote(event.noteId);
        setGuideNoteId(event.noteId);
        setProgress({
          resolved: index + 1,
          total: song.events.length,
          hits: 0,
        });
      }, event.atMs);
      timersRef.current.push(timer);
    });

    const lastAtMs = song.events[song.events.length - 1]?.atMs ?? 0;
    const endTimer = setTimeout(() => {
      setGuideNoteId(null);
      setPhase('pickLevel');
    }, lastAtMs + 1500);
    timersRef.current.push(endTimer);
  }, [clearTimers, playNote]);

  // "Step by step" level: the next note lights up and waits — the song only
  // advances when the user presses the right key. No clock, no misses.
  const startStepMode = useCallback(() => {
    const song = songRef.current;
    if (!song) {
      return;
    }

    clearTimers();
    setResults(null);
    pointerRef.current = 0;
    statsRef.current = { hits: 0, autos: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: song.events.length, hits: 0 });
    setPhase('playing');
    updateGuide();
  }, [clearTimers, updateGuide]);

  const startCountdown = useCallback(() => {
    clearTimers();
    setResults(null);
    setCountdownValue(COUNTDOWN_START);
    setPhase('countdown');
    setGuideNoteId(null);

    for (let step = 1; step <= COUNTDOWN_START; step++) {
      const timer = setTimeout(() => {
        const remaining = COUNTDOWN_START - step;
        if (remaining > 0) {
          setCountdownValue(remaining);
        } else {
          startPlaying();
        }
      }, step * COUNTDOWN_STEP_MS);
      timersRef.current.push(timer);
    }
  }, [clearTimers, startPlaying]);

  const open = useCallback(() => {
    clearTimers();
    setSelectedSong(null);
    songRef.current = null;
    setResults(null);
    setGuideNoteId(null);
    setPhase('pickSong');
  }, [clearTimers]);

  const close = useCallback(() => {
    clearTimers();
    setSelectedSong(null);
    songRef.current = null;
    setResults(null);
    setGuideNoteId(null);
    setPhase('idle');
  }, [clearTimers]);

  const selectSong = useCallback((songId: string) => {
    const song = getSongById(songId);
    if (!song) {
      return;
    }

    setSelectedSong(song);
    songRef.current = song;
    setPhase('pickLevel');
  }, []);

  const startForLevel = useCallback(
    (targetLevel: SupportLevel) => {
      if (targetLevel === 'guided') {
        startDemo();
      } else if (targetLevel === 'medium') {
        startStepMode();
      } else {
        startCountdown();
      }
    },
    [startCountdown, startDemo, startStepMode],
  );

  const selectLevel = useCallback(
    (nextLevel: SupportLevel) => {
      setLevel(nextLevel);
      levelRef.current = nextLevel;
      startForLevel(nextLevel);
    },
    [startForLevel],
  );

  const backToSongList = useCallback(() => {
    setPhase('pickSong');
  }, []);

  const replay = useCallback(() => {
    if (!songRef.current) {
      return;
    }
    startForLevel(levelRef.current);
  }, [startForLevel]);

  const handleNotePress = useCallback(
    (noteId: NoteId) => {
      // The instrument always sounds — scoring happens on top of playing.
      playNote(noteId);

      const song = songRef.current;
      if (!song || phaseRef.current !== 'playing') {
        return;
      }

      const event = song.events[pointerRef.current];

      // Step mode: no clock — the right key advances, a wrong key just counts.
      if (levelRef.current === 'medium') {
        if (event && noteId === event.noteId) {
          statsRef.current.hits += 1;
          advancePointer();
        } else {
          statsRef.current.wrongPresses += 1;
        }
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;

      if (
        event &&
        noteId === event.noteId &&
        elapsed >= event.atMs - HIT_WINDOW_MS &&
        elapsed <= event.atMs + HIT_WINDOW_MS
      ) {
        statsRef.current.hits += 1;
        advancePointer();
      } else {
        statsRef.current.wrongPresses += 1;
      }
    },
    [advancePointer, playNote],
  );

  const isActive =
    phase === 'countdown' || phase === 'demo' || phase === 'playing';

  return {
    songs: PIANO_SONGS,
    phase,
    selectedSong,
    level,
    countdownValue,
    guideNoteId,
    progress,
    results,
    isActive,
    open,
    close,
    selectSong,
    selectLevel,
    backToSongList,
    replay,
    handleNotePress,
  };
}
