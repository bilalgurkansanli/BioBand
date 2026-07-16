import { useCallback, useEffect, useRef, useState } from 'react';

import { getViolinSongById, VIOLIN_SONGS } from '../instruments/violin/songs/catalog';
import { resolveViolinPlaySession } from '../instruments/violin/songs/resolvePlaySession';
import type {
  ViolinSongDefinition,
  ViolinSongEvent,
  ViolinSongScope,
  ResolvedViolinSession,
} from '../instruments/violin/songs/types';

export type SupportLevel = 'guided' | 'medium' | 'free';
export type PlayTempo = 'slow' | 'normal' | 'fast';

export const TEMPO_RATES: Record<PlayTempo, number> = {
  slow: 0.75,
  normal: 1,
  fast: 1.25,
};

export type ViolinPlayAlongPhase =
  | 'idle'
  | 'pickSong'
  | 'pickScope'
  | 'pickLevel'
  | 'countdown'
  | 'demo'
  | 'playing'
  | 'results';

export type ViolinPlayAlongResults = {
  totalNotes: number;
  hits: number;
  misses: number;
  wrongPresses: number;
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
};

export type ViolinPlayAlongProgress = {
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

export function useViolinPlayAlong(
  playSoundId: (soundId: string) => void,
  extraSongs: ViolinSongDefinition[] = [],
) {
  const [phase, setPhase] = useState<ViolinPlayAlongPhase>('idle');
  const [selectedSong, setSelectedSong] = useState<ViolinSongDefinition | null>(null);
  const [songScope, setSongScope] = useState<ViolinSongScope | null>(null);
  const [level, setLevel] = useState<SupportLevel>('guided');
  const [tempo, setTempoState] = useState<PlayTempo>('normal');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START);
  const [guideSoundId, setGuideSoundId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ViolinPlayAlongProgress>({
    resolved: 0,
    total: 0,
    hits: 0,
  });
  const [results, setResults] = useState<ViolinPlayAlongResults | null>(null);
  const [demoJustFinished, setDemoJustFinished] = useState(false);

  const extraSongsRef = useRef(extraSongs);
  extraSongsRef.current = extraSongs;
  const songRef = useRef<ViolinSongDefinition | null>(null);
  const sessionRef = useRef<ResolvedViolinSession | null>(null);
  const eventsRef = useRef<ViolinSongEvent[]>([]);
  const songScopeRef = useRef<ViolinSongScope | null>(null);
  const levelRef = useRef<SupportLevel>('guided');
  const tempoRef = useRef<PlayTempo>('normal');
  const phaseRef = useRef<ViolinPlayAlongPhase>('idle');
  const startTimeRef = useRef(0);
  const pointerRef = useRef(0);
  const statsRef = useRef({ hits: 0, misses: 0, wrongPresses: 0 });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  phaseRef.current = phase;
  songScopeRef.current = songScope;
  tempoRef.current = tempo;

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
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const getElapsedMs = useCallback(() => {
    const wall = Date.now() - startTimeRef.current;
    return wall * TEMPO_RATES[tempoRef.current];
  }, []);

  const updateGuide = useCallback(() => {
    const events = eventsRef.current;
    if (events.length === 0 || pointerRef.current >= events.length) {
      setGuideSoundId(null);
      return;
    }
    if (levelRef.current === 'free') {
      setGuideSoundId(null);
      return;
    }
    setGuideSoundId(events[pointerRef.current]?.soundId ?? null);
  }, []);

  const finishSong = useCallback(() => {
    clearTimers();
    setGuideSoundId(null);

    const events = eventsRef.current;
    const stats = statsRef.current;
    const scored = stats.hits + stats.misses + stats.wrongPresses;
    const accuracy = scored > 0 ? stats.hits / scored : 0;

    setResults({
      totalNotes: events.length,
      hits: stats.hits,
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

    const events = eventsRef.current;
    setProgress({
      resolved: pointerRef.current,
      total: events.length,
      hits: statsRef.current.hits,
    });

    if (pointerRef.current >= events.length) {
      finishSong();
    }
  }, [finishSong, updateGuide]);

  const buildSession = useCallback((): ResolvedViolinSession | null => {
    const song = songRef.current;
    const scope = songScopeRef.current;
    if (!song || !scope) {
      return null;
    }
    const session = resolveViolinPlaySession(song, scope);
    sessionRef.current = session;
    eventsRef.current = session.events;
    return session;
  }, []);

  const finishDemo = useCallback(() => {
    clearTimers();
    setGuideSoundId(null);
    setDemoJustFinished(true);
    setPhase('pickLevel');
  }, [clearTimers]);

  const startTick = useCallback(() => {
    tickRef.current = setInterval(() => {
      const events = eventsRef.current;
      if (!events.length || phaseRef.current !== 'playing') {
        return;
      }
      if (levelRef.current !== 'free') {
        return;
      }

      const elapsed = getElapsedMs();
      while (
        pointerRef.current < events.length &&
        elapsed > events[pointerRef.current].atMs + HIT_WINDOW_MS
      ) {
        statsRef.current.misses += 1;
        advancePointer();
      }
    }, TICK_MS);
  }, [advancePointer, getElapsedMs]);

  const startPlaying = useCallback(() => {
    const session = sessionRef.current ?? buildSession();
    if (!session) {
      return;
    }

    startTimeRef.current = Date.now();
    pointerRef.current = 0;
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: session.events.length, hits: 0 });
    setPhase('playing');
    updateGuide();
    startTick();
  }, [buildSession, startTick, updateGuide]);

  const startDemo = useCallback(() => {
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    setDemoJustFinished(false);
    pointerRef.current = 0;
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: session.events.length, hits: 0 });
    setPhase('demo');
    setGuideSoundId(session.events[0]?.soundId ?? null);

    const rate = TEMPO_RATES[tempoRef.current];
    startTimeRef.current = Date.now();

    session.events.forEach((event, index) => {
      const timer = setTimeout(() => {
        playSoundId(event.soundId);
        setGuideSoundId(event.soundId);
        setProgress({
          resolved: index + 1,
          total: session.events.length,
          hits: 0,
        });
      }, event.atMs / rate);
      timersRef.current.push(timer);
    });

    const lastAtMs = session.events[session.events.length - 1]?.atMs ?? 0;
    const endTimer = setTimeout(() => {
      finishDemo();
    }, lastAtMs / rate + 1500);
    timersRef.current.push(endTimer);
  }, [buildSession, clearTimers, finishDemo, playSoundId]);

  const startStepMode = useCallback(() => {
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    pointerRef.current = 0;
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: session.events.length, hits: 0 });
    setPhase('playing');
    updateGuide();
  }, [buildSession, clearTimers, updateGuide]);

  const startCountdown = useCallback(() => {
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    setCountdownValue(COUNTDOWN_START);
    setPhase('countdown');
    setGuideSoundId(null);

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
  }, [buildSession, clearTimers, startPlaying]);

  const resetWizard = useCallback(() => {
    clearTimers();
    setSelectedSong(null);
    songRef.current = null;
    sessionRef.current = null;
    eventsRef.current = [];
    setSongScope(null);
    setResults(null);
    setGuideSoundId(null);
    setDemoJustFinished(false);
  }, [clearTimers]);

  const open = useCallback(() => {
    resetWizard();
    setPhase('pickSong');
  }, [resetWizard]);

  const close = useCallback(() => {
    resetWizard();
    setPhase('idle');
  }, [resetWizard]);

  const selectSong = useCallback((songId: string) => {
    const song =
      getViolinSongById(songId) ??
      extraSongsRef.current.find((entry) => entry.id === songId);
    if (!song) {
      return;
    }
    setSelectedSong(song);
    songRef.current = song;
    setSongScope(null);
    songScopeRef.current = null;
    setPhase('pickScope');
  }, []);

  const selectScope = useCallback((scope: ViolinSongScope) => {
    setSongScope(scope);
    songScopeRef.current = scope;
    setDemoJustFinished(false);
    setPhase('pickLevel');
  }, []);

  const selectLevel = useCallback(
    (nextLevel: SupportLevel) => {
      setLevel(nextLevel);
      levelRef.current = nextLevel;
      setDemoJustFinished(false);

      if (nextLevel === 'guided') {
        startDemo();
        return;
      }
      if (nextLevel === 'medium') {
        void startStepMode();
        return;
      }
      startCountdown();
    },
    [startCountdown, startDemo, startStepMode],
  );

  const setTempo = useCallback((next: PlayTempo) => {
    setTempoState(next);
    tempoRef.current = next;
  }, []);

  const goBack = useCallback(() => {
    if (phase === 'pickScope') {
      setPhase('pickSong');
      setSelectedSong(null);
      songRef.current = null;
      return;
    }
    if (phase === 'pickLevel') {
      setPhase('pickScope');
      setDemoJustFinished(false);
      return;
    }
    if (phase === 'results') {
      setPhase('pickLevel');
      setResults(null);
    }
  }, [phase]);

  const backToSongList = useCallback(() => {
    clearTimers();
    setSelectedSong(null);
    songRef.current = null;
    sessionRef.current = null;
    eventsRef.current = [];
    setSongScope(null);
    setResults(null);
    setGuideSoundId(null);
    setDemoJustFinished(false);
    setPhase('pickSong');
  }, [clearTimers]);

  const replay = useCallback(() => {
    setResults(null);
    setDemoJustFinished(false);
    setPhase('pickLevel');
  }, []);

  const handleSoundPress = useCallback(
    (soundId: string, options?: { skipPlayback?: boolean }) => {
      const play = () => {
        if (!options?.skipPlayback) {
          playSoundId(soundId);
        }
      };

      if (phaseRef.current === 'demo') {
        return;
      }
      if (phaseRef.current !== 'playing') {
        play();
        return;
      }

      const events = eventsRef.current;
      const idx = pointerRef.current;
      const expected = events[idx];
      if (!expected) {
        return;
      }

      if (levelRef.current === 'medium') {
        if (soundId === expected.soundId) {
          play();
          statsRef.current.hits += 1;
          advancePointer();
        } else {
          play();
          statsRef.current.wrongPresses += 1;
        }
        return;
      }

      const elapsed = getElapsedMs();
      const delta = Math.abs(elapsed - expected.atMs);
      if (soundId === expected.soundId && delta <= HIT_WINDOW_MS) {
        play();
        statsRef.current.hits += 1;
        advancePointer();
      } else {
        play();
        statsRef.current.wrongPresses += 1;
      }
    },
    [advancePointer, getElapsedMs, playSoundId],
  );

  const isActive = phase !== 'idle';
  const songs = [...VIOLIN_SONGS, ...extraSongs];

  return {
    phase,
    selectedSong,
    songScope,
    level,
    tempo,
    countdownValue,
    guideSoundId,
    progress,
    results,
    demoJustFinished,
    isActive,
    songs,
    open,
    close,
    selectSong,
    selectScope,
    selectLevel,
    setTempo,
    goBack,
    backToSongList,
    replay,
    handleSoundPress,
  };
}
