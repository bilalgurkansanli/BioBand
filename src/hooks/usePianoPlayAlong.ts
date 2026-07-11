import { useCallback, useEffect, useRef, useState } from 'react';

import type { NoteId } from '../instruments/piano/pianoNotes';
import { getSongById, PIANO_SONGS } from '../instruments/piano/songs/catalog';
import {
  resolvePlaySession,
  type ResolvedPlaySession,
} from '../instruments/piano/songs/resolvePlaySession';
import {
  getBackingCurrentTimeMs,
  getBackingElapsedMs,
  onBackingFinished,
  pauseBackingTrack,
  playBackingFrom,
  prepareBackingTrack,
  stopBackingTrack,
} from '../instruments/piano/songs/songBackingPlayer';
import type {
  PlayMode,
  SongDefinition,
  SongEvent,
  SongScope,
} from '../instruments/piano/songs/types';

export type { PlayMode, SongScope };
export type SupportLevel = 'guided' | 'medium' | 'free';

export type PlayAlongPhase =
  | 'idle'
  | 'pickSong'
  | 'pickMode'
  | 'pickScope'
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

export function usePianoPlayAlong(
  playNote: (noteId: NoteId) => void,
  extraSongs: SongDefinition[] = [],
) {
  const [phase, setPhase] = useState<PlayAlongPhase>('idle');
  const [selectedSong, setSelectedSong] = useState<SongDefinition | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);
  const [songScope, setSongScope] = useState<SongScope | null>(null);
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
  const sessionRef = useRef<ResolvedPlaySession | null>(null);
  const eventsRef = useRef<SongEvent[]>([]);
  const playModeRef = useRef<PlayMode | null>(null);
  const songScopeRef = useRef<SongScope | null>(null);
  const levelRef = useRef<SupportLevel>('guided');
  const phaseRef = useRef<PlayAlongPhase>('idle');
  const extraSongsRef = useRef(extraSongs);
  extraSongsRef.current = extraSongs;
  const startTimeRef = useRef(0);
  const pointerRef = useRef(0);
  const statsRef = useRef({ hits: 0, autos: 0, misses: 0, wrongPresses: 0 });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const notesFinishedRef = useRef(false);

  phaseRef.current = phase;
  playModeRef.current = playMode;
  songScopeRef.current = songScope;

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

  const stopSessionAudio = useCallback(() => {
    void stopBackingTrack();
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      void stopBackingTrack();
    };
  }, [clearTimers]);

  const getElapsedMs = useCallback(() => {
    const session = sessionRef.current;
    if (session?.useBacking) {
      return getBackingElapsedMs(session.audioStartMs);
    }
    return Date.now() - startTimeRef.current;
  }, []);

  const updateGuide = useCallback(() => {
    const events = eventsRef.current;
    if (events.length === 0 || levelRef.current === 'free') {
      setGuideNoteId(null);
      return;
    }
    setGuideNoteId(events[pointerRef.current]?.noteId ?? null);
  }, []);

  const finishSong = useCallback(() => {
    clearTimers();
    stopSessionAudio();
    setGuideNoteId(null);

    const events = eventsRef.current;
    const stats = statsRef.current;
    const totalNotes = events.length;
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
  }, [clearTimers, stopSessionAudio]);

  const maybeFinishAfterNotes = useCallback(() => {
    const session = sessionRef.current;
    const events = eventsRef.current;
    if (pointerRef.current < events.length) {
      return;
    }
    notesFinishedRef.current = true;

    // Full-band + full scope: keep listening until the track ends (or partial end).
    if (session?.useBacking && songScopeRef.current === 'full') {
      return;
    }
    finishSong();
  }, [finishSong]);

  const advancePointer = useCallback(() => {
    pointerRef.current += 1;
    updateGuide();

    const events = eventsRef.current;
    setProgress({
      resolved: pointerRef.current,
      total: events.length,
      hits: statsRef.current.hits,
    });

    if (pointerRef.current >= events.length) {
      maybeFinishAfterNotes();
    }
  }, [maybeFinishAfterNotes, updateGuide]);

  const buildSession = useCallback((): ResolvedPlaySession | null => {
    const song = songRef.current;
    const mode = playModeRef.current;
    const scope = songScopeRef.current;
    if (!song || !mode || !scope) {
      return null;
    }
    const session = resolvePlaySession(song, mode, scope);
    sessionRef.current = session;
    eventsRef.current = session.events;
    return session;
  }, []);

  const ensureBackingReady = useCallback(async (session: ResolvedPlaySession) => {
    const song = songRef.current;
    if (!session.useBacking || !song?.backingTrack) {
      await stopBackingTrack();
      return;
    }
    await prepareBackingTrack(song.backingTrack.module);
    onBackingFinished(() => {
      if (phaseRef.current === 'demo') {
        setGuideNoteId(null);
        setPhase('pickLevel');
        void stopBackingTrack();
        return;
      }
      if (phaseRef.current === 'playing' || phaseRef.current === 'countdown') {
        finishSong();
      }
    });
  }, [finishSong]);

  const startTick = useCallback(() => {
    tickRef.current = setInterval(() => {
      const events = eventsRef.current;
      const session = sessionRef.current;
      if (!events.length || phaseRef.current !== 'playing') {
        return;
      }

      const elapsed = getElapsedMs();

      // Partial window end while notes still pending.
      if (
        session?.useBacking &&
        session.audioEndMs != null &&
        getBackingCurrentTimeMs() >= session.audioEndMs
      ) {        pauseBackingTrack();
        if (notesFinishedRef.current || pointerRef.current >= events.length) {
          finishSong();
        } else {
          // Force-miss remaining notes in free mode, then finish.
          while (pointerRef.current < events.length) {
            statsRef.current.misses += 1;
            pointerRef.current += 1;
          }
          setProgress({
            resolved: events.length,
            total: events.length,
            hits: statsRef.current.hits,
          });
          finishSong();
        }
        return;
      }

      if (levelRef.current !== 'free') {
        return;
      }

      while (
        pointerRef.current < events.length &&
        elapsed > events[pointerRef.current].atMs + HIT_WINDOW_MS
      ) {
        statsRef.current.misses += 1;
        advancePointer();
      }
    }, TICK_MS);
  }, [advancePointer, finishSong, getElapsedMs]);

  const startPlaying = useCallback(() => {
    const session = sessionRef.current ?? buildSession();
    if (!session) {
      return;
    }

    notesFinishedRef.current = false;
    startTimeRef.current = Date.now();
    pointerRef.current = 0;
    statsRef.current = { hits: 0, autos: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: session.events.length, hits: 0 });
    setPhase('playing');
    updateGuide();

    if (session.useBacking) {
      void playBackingFrom(session.audioStartMs);
    }
    startTick();
  }, [buildSession, startTick, updateGuide]);

  const startDemo = useCallback(async () => {
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    notesFinishedRef.current = false;
    pointerRef.current = 0;
    statsRef.current = { hits: 0, autos: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: session.events.length, hits: 0 });
    setPhase('demo');
    setGuideNoteId(session.events[0]?.noteId ?? null);

    await ensureBackingReady(session);

    if (session.useBacking) {
      // Light keys from the audio clock; don't double the melody over vocals.
      await playBackingFrom(session.audioStartMs);
      startTimeRef.current = Date.now();

      tickRef.current = setInterval(() => {
        if (phaseRef.current !== 'demo') {
          return;
        }
        const elapsed = getElapsedMs();
        const events = eventsRef.current;
        let idx = 0;
        while (idx < events.length && events[idx].atMs <= elapsed) {
          idx += 1;
        }
        const current = Math.max(0, idx - 1);
        pointerRef.current = current;
        setGuideNoteId(events[current]?.noteId ?? null);
        setProgress({
          resolved: Math.min(events.length, idx),
          total: events.length,
          hits: 0,
        });

        if (
          session.audioEndMs != null &&
          getBackingCurrentTimeMs() >= session.audioEndMs
        ) {
          pauseBackingTrack();
          setGuideNoteId(null);
          setPhase('pickLevel');
          clearTimers();
          void stopBackingTrack();
        }
      }, TICK_MS);
      return;
    }

    session.events.forEach((event, index) => {
      const timer = setTimeout(() => {
        playNote(event.noteId);
        setGuideNoteId(event.noteId);
        setProgress({
          resolved: index + 1,
          total: session.events.length,
          hits: 0,
        });
      }, event.atMs);
      timersRef.current.push(timer);
    });

    const lastAtMs = session.events[session.events.length - 1]?.atMs ?? 0;
    const endTimer = setTimeout(() => {
      setGuideNoteId(null);
      setPhase('pickLevel');
    }, lastAtMs + 1500);
    timersRef.current.push(endTimer);
  }, [
    buildSession,
    clearTimers,
    ensureBackingReady,
    getElapsedMs,
    playNote,
  ]);

  const startStepMode = useCallback(async () => {
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    notesFinishedRef.current = false;
    pointerRef.current = 0;
    statsRef.current = { hits: 0, autos: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: session.events.length, hits: 0 });
    setPhase('playing');
    updateGuide();

    await ensureBackingReady(session);
    if (session.useBacking) {
      await playBackingFrom(session.audioStartMs);
      startTick();
    }
  }, [buildSession, clearTimers, ensureBackingReady, startTick, updateGuide]);

  const startCountdown = useCallback(async () => {
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    setCountdownValue(COUNTDOWN_START);
    setPhase('countdown');
    setGuideNoteId(null);

    await ensureBackingReady(session);

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
  }, [buildSession, clearTimers, ensureBackingReady, startPlaying]);

  const resetWizardSong = useCallback(() => {
    clearTimers();
    stopSessionAudio();
    setSelectedSong(null);
    songRef.current = null;
    sessionRef.current = null;
    eventsRef.current = [];
    setPlayMode(null);
    setSongScope(null);
    setResults(null);
    setGuideNoteId(null);
  }, [clearTimers, stopSessionAudio]);

  const open = useCallback(() => {
    resetWizardSong();
    setPhase('pickSong');
  }, [resetWizardSong]);

  const close = useCallback(() => {
    resetWizardSong();
    setPhase('idle');
  }, [resetWizardSong]);

  const selectSong = useCallback((songId: string) => {
    const song =
      getSongById(songId) ??
      extraSongsRef.current.find((entry) => entry.id === songId);
    if (!song) {
      return;
    }

    setSelectedSong(song);
    songRef.current = song;
    setPlayMode(null);
    setSongScope(null);
    setPhase('pickMode');
  }, []);

  const selectPlayMode = useCallback((mode: PlayMode) => {
    const song = songRef.current;
    if (mode === 'fullBand' && !song?.backingTrack) {
      return;
    }
    setPlayMode(mode);
    playModeRef.current = mode;
    setSongScope(null);
    setPhase('pickScope');
  }, []);

  const selectScope = useCallback((scope: SongScope) => {
    setSongScope(scope);
    songScopeRef.current = scope;
    setPhase('pickLevel');
  }, []);

  const startForLevel = useCallback(
    (targetLevel: SupportLevel) => {
      if (targetLevel === 'guided') {
        void startDemo();
      } else if (targetLevel === 'medium') {
        void startStepMode();
      } else {
        void startCountdown();
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
    clearTimers();
    stopSessionAudio();
    setPlayMode(null);
    setSongScope(null);
    setPhase('pickSong');
  }, [clearTimers, stopSessionAudio]);

  const goBack = useCallback(() => {
    if (phase === 'pickMode') {
      setPlayMode(null);
      setSongScope(null);
      setPhase('pickSong');
      return;
    }
    if (phase === 'pickScope') {
      setSongScope(null);
      setPhase('pickMode');
      return;
    }
    if (phase === 'pickLevel' || phase === 'results') {
      clearTimers();
      stopSessionAudio();
      setPhase('pickScope');
    }
  }, [clearTimers, phase, stopSessionAudio]);

  const replay = useCallback(() => {
    if (!songRef.current) {
      return;
    }
    startForLevel(levelRef.current);
  }, [startForLevel]);

  const handleNotePress = useCallback(
    (noteId: NoteId) => {
      playNote(noteId);

      const events = eventsRef.current;
      if (!events.length || phaseRef.current !== 'playing') {
        return;
      }

      const event = events[pointerRef.current];

      if (levelRef.current === 'medium') {
        if (event && noteId === event.noteId) {
          statsRef.current.hits += 1;
          advancePointer();
        } else {
          statsRef.current.wrongPresses += 1;
        }
        return;
      }

      const elapsed = getElapsedMs();

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
    [advancePointer, getElapsedMs, playNote],
  );

  const isActive =
    phase === 'countdown' || phase === 'demo' || phase === 'playing';

  return {
    songs: [...PIANO_SONGS, ...extraSongs],
    phase,
    selectedSong,
    playMode,
    songScope,
    level,
    countdownValue,
    guideNoteId,
    progress,
    results,
    isActive,
    open,
    close,
    selectSong,
    selectPlayMode,
    selectScope,
    selectLevel,
    goBack,
    backToSongList,
    replay,
    handleNotePress,
  };
}
