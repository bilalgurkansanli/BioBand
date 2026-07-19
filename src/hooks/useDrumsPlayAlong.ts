import { useCallback, useEffect, useRef, useState } from 'react';

import { awardPlayAlongCompletion } from '../profile/awardPlayAlong';
import type { DrumSoundId } from '../instruments/drums/drumsSounds';
import { getDrumSongById, DRUM_SONGS } from '../instruments/drums/songs/catalog';
import { resolveDrumPlaySession } from '../instruments/drums/songs/resolvePlaySession';
import type {
  DrumSongDefinition,
  DrumSongEvent,
  DrumSongScope,
  PlayMode,
  ResolvedDrumSession,
} from '../instruments/drums/songs/types';
import { songHasBackingAudio } from '../instruments/piano/songs/types';
import {
  getBackingCurrentTimeMs,
  getBackingElapsedMs,
  onBackingFinished,
  pauseBackingTrack,
  playBackingFrom,
  prepareBackingTrack,
  setBackingPlaybackRate,
  stopBackingTrack,
} from '../instruments/piano/songs/songBackingPlayer';
import { prepareSamplePlayback } from '../audio/sampleBank';
import {
  copySongAudioFile,
  mergeSongWithAudioBinding,
  saveSongAudioBinding,
} from '../storage/songAudioBindingsStorage';

export type { PlayMode, DrumSongScope };
export type SupportLevel = 'guided' | 'medium' | 'free';
export type PlayTempo = 'slow' | 'normal' | 'fast';

export const TEMPO_RATES: Record<PlayTempo, number> = {
  slow: 0.75,
  normal: 1,
  fast: 1.25,
};

export type DrumsPlayAlongPhase =
  | 'idle'
  | 'pickSong'
  | 'pickScope'
  | 'pickMode'
  | 'pickAudio'
  | 'calibrateOffset'
  | 'pickLevel'
  | 'countdown'
  | 'demo'
  | 'playing'
  | 'results';

export type DrumsPlayAlongResults = {
  totalNotes: number;
  hits: number;
  misses: number;
  wrongPresses: number;
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
};

export type DrumsPlayAlongProgress = {
  resolved: number;
  total: number;
  hits: number;
};

const HIT_WINDOW_MS = 350;
/** Slightly wider window when playing over a live mix (latency + distraction). */
const HIT_WINDOW_BAND_MS = 480;
const TICK_MS = 60;
const COUNTDOWN_START = 3;
const COUNTDOWN_STEP_MS = 800;
const RESULTS_DELAY_MS = 700;
const CALIBRATE_PREVIEW_MS = 4500;
const OFFSET_MIN_MS = -5000;
const OFFSET_MAX_MS = 60_000;
/** Cap on awarded practice time per finish — protects the profile stats. */
const MAX_AWARD_ELAPSED_MS = 30 * 60_000;

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

function clampOffset(ms: number): number {
  return Math.max(OFFSET_MIN_MS, Math.min(OFFSET_MAX_MS, Math.round(ms)));
}

export function useDrumsPlayAlong(
  playHit: (id: DrumSoundId) => void,
  extraSongs: DrumSongDefinition[] = [],
  onUserSongOffsetSaved?: (songId: string, eventsStartMs: number) => void,
) {
  const [phase, setPhase] = useState<DrumsPlayAlongPhase>('idle');
  const [selectedSong, setSelectedSong] = useState<DrumSongDefinition | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);
  const [songScope, setSongScope] = useState<DrumSongScope | null>(null);
  const [level, setLevel] = useState<SupportLevel>('guided');
  const [tempo, setTempoState] = useState<PlayTempo>('normal');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START);
  const [guidePadId, setGuidePadId] = useState<DrumSoundId | null>(null);
  const [progress, setProgress] = useState<DrumsPlayAlongProgress>({
    resolved: 0,
    total: 0,
    hits: 0,
  });
  const [results, setResults] = useState<DrumsPlayAlongResults | null>(null);
  const [demoJustFinished, setDemoJustFinished] = useState(false);
  const [calibrateOffsetMs, setCalibrateOffsetMs] = useState(0);
  const [calibratePreviewing, setCalibratePreviewing] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);

  const extraSongsRef = useRef(extraSongs);
  extraSongsRef.current = extraSongs;
  const songRef = useRef<DrumSongDefinition | null>(null);
  const sessionRef = useRef<ResolvedDrumSession | null>(null);
  const eventsRef = useRef<DrumSongEvent[]>([]);
  const playModeRef = useRef<PlayMode | null>(null);
  const songScopeRef = useRef<DrumSongScope | null>(null);
  const levelRef = useRef<SupportLevel>('guided');
  const tempoRef = useRef<PlayTempo>('normal');
  const phaseRef = useRef<DrumsPlayAlongPhase>('idle');
  const startTimeRef = useRef(0);
  const pointerRef = useRef(0);
  const statsRef = useRef({ hits: 0, misses: 0, wrongPresses: 0 });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const notesFinishedRef = useRef(false);
  /** True when user already had a saved binding (skip calibrate on re-entry). */
  const hadSavedBindingRef = useRef(false);

  phaseRef.current = phase;
  playModeRef.current = playMode;
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

  const stopSessionAudio = useCallback(() => {
    void stopBackingTrack();
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      void stopBackingTrack();
    };
  }, [clearTimers]);

  const applySong = useCallback((song: DrumSongDefinition) => {
    setSelectedSong(song);
    songRef.current = song;
  }, []);

  const getElapsedMs = useCallback(() => {
    const session = sessionRef.current;
    if (session?.useBacking) {
      return getBackingElapsedMs(session.audioStartMs);
    }
    const wall = Date.now() - startTimeRef.current;
    return wall * TEMPO_RATES[tempoRef.current];
  }, []);

  const updateGuide = useCallback(() => {
    const events = eventsRef.current;
    if (events.length === 0 || pointerRef.current >= events.length) {
      setGuidePadId(null);
      return;
    }
    if (levelRef.current === 'free' && playModeRef.current !== 'fullBand') {
      setGuidePadId(null);
      return;
    }
    setGuidePadId(events[pointerRef.current]?.padId ?? null);
  }, []);

  const finishSong = useCallback(() => {
    clearTimers();
    stopSessionAudio();
    setGuidePadId(null);

    const events = eventsRef.current;
    const stats = statsRef.current;
    const scored = stats.hits + stats.misses + stats.wrongPresses;
    const accuracy = scored > 0 ? stats.hits / scored : 0;
    const stars = computeStars(accuracy);

    setResults({
      totalNotes: events.length,
      hits: stats.hits,
      misses: stats.misses,
      wrongPresses: stats.wrongPresses,
      accuracy,
      stars,
    });

    // Award real wall-clock time (not tempo-scaled game time), capped so a
    // stale start timestamp can never corrupt the practice stats.
    const wallElapsed = Date.now() - startTimeRef.current;
    void awardPlayAlongCompletion({
      instrument: 'drums',
      songId: songRef.current?.id ?? null,
      stars,
      elapsedMs: Math.min(Math.max(0, wallElapsed), MAX_AWARD_ELAPSED_MS),
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
    setGuidePadId(null);

    // With backing audio, let the track play out; the tick loop or the
    // finished-callback ends the session.
    if (session?.useBacking) {
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

  const buildSession = useCallback((): ResolvedDrumSession | null => {
    const song = songRef.current;
    const mode = playModeRef.current;
    const scope = songScopeRef.current;
    if (!song || !mode || !scope) {
      return null;
    }
    const session = resolveDrumPlaySession(song, mode, scope);
    sessionRef.current = session;
    // Own copy: simultaneous-hit matching reorders events within a same-time
    // group, and the catalog's arrays must never be mutated.
    eventsRef.current = [...session.events];
    return session;
  }, []);

  const finishDemo = useCallback(() => {
    clearTimers();
    stopSessionAudio();
    setGuidePadId(null);
    setDemoJustFinished(true);
    setPhase('pickLevel');
  }, [clearTimers, stopSessionAudio]);

  const ensureBackingReady = useCallback(
    async (session: ResolvedDrumSession) => {
      const song = songRef.current;
      if (!session.useBacking || !songHasBackingAudio(song?.backingTrack)) {
        await stopBackingTrack();
        return;
      }
      await prepareSamplePlayback();
      setBackingPlaybackRate(TEMPO_RATES[tempoRef.current]);
      await prepareBackingTrack(song!.backingTrack!);
      setBackingPlaybackRate(TEMPO_RATES[tempoRef.current]);
      onBackingFinished(() => {
        if (phaseRef.current === 'demo') {
          finishDemo();
          return;
        }
        if (phaseRef.current === 'playing' || phaseRef.current === 'countdown') {
          finishSong();
        }
      });
    },
    [finishDemo, finishSong],
  );

  const startTick = useCallback(() => {
    tickRef.current = setInterval(() => {
      const events = eventsRef.current;
      const session = sessionRef.current;
      if (!events.length || phaseRef.current !== 'playing') {
        return;
      }

      const elapsed = getElapsedMs();

      if (
        session?.useBacking &&
        session.audioEndMs != null &&
        getBackingCurrentTimeMs() >= session.audioEndMs
      ) {
        pauseBackingTrack();
        if (notesFinishedRef.current || pointerRef.current >= events.length) {
          finishSong();
        } else {
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

      const missWindow =
        playModeRef.current === 'fullBand' ? HIT_WINDOW_BAND_MS : HIT_WINDOW_MS;

      while (
        pointerRef.current < events.length &&
        elapsed > events[pointerRef.current].atMs + missWindow
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
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
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
    setDemoJustFinished(false);
    notesFinishedRef.current = false;
    pointerRef.current = 0;
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: session.events.length, hits: 0 });
    setPhase('demo');
    setGuidePadId(session.events[0]?.padId ?? null);

    await ensureBackingReady(session);

    const rate = TEMPO_RATES[tempoRef.current];

    if (session.useBacking) {
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
        setGuidePadId(events[current]?.padId ?? null);
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
          finishDemo();
        }
      }, TICK_MS);
      return;
    }

    startTimeRef.current = Date.now();
    session.events.forEach((event, index) => {
      const timer = setTimeout(() => {
        playHit(event.padId);
        setGuidePadId(event.padId);
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
  }, [
    buildSession,
    clearTimers,
    ensureBackingReady,
    finishDemo,
    getElapsedMs,
    playHit,
  ]);

  const startStepMode = useCallback(async () => {
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    notesFinishedRef.current = false;
    // Step mode has no game clock, but the practice-time award still reads
    // this timestamp — leaving it stale inflated the profile stats.
    startTimeRef.current = Date.now();
    pointerRef.current = 0;
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
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
    setGuidePadId(null);

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

  const resetWizard = useCallback(() => {
    clearTimers();
    stopSessionAudio();
    setSelectedSong(null);
    songRef.current = null;
    sessionRef.current = null;
    eventsRef.current = [];
    setPlayMode(null);
    setSongScope(null);
    setResults(null);
    setGuidePadId(null);
    setDemoJustFinished(false);
    setCalibrateOffsetMs(0);
    setCalibratePreviewing(false);
    hadSavedBindingRef.current = false;
  }, [clearTimers, stopSessionAudio]);

  const open = useCallback(() => {
    resetWizard();
    setPhase('pickSong');
  }, [resetWizard]);

  const close = useCallback(() => {
    resetWizard();
    setPhase('idle');
  }, [resetWizard]);

  const selectSong = useCallback(
    async (songId: string) => {
      const base =
        getDrumSongById(songId) ??
        extraSongsRef.current.find((entry) => entry.id === songId);
      if (!base) {
        return;
      }

      const merged = (await mergeSongWithAudioBinding(
        base as unknown as Parameters<typeof mergeSongWithAudioBinding>[0],
      )) as unknown as DrumSongDefinition;
      applySong(merged);
      hadSavedBindingRef.current = songHasBackingAudio(merged.backingTrack);
      setPlayMode('drums');
      playModeRef.current = 'drums';
      setSongScope(null);
      songScopeRef.current = null;
      setPhase('pickScope');
    },
    [applySong],
  );

  const enterCalibrate = useCallback(() => {
    const song = songRef.current;
    setCalibrateOffsetMs(song?.backingTrack?.eventsStartMs ?? 0);
    setCalibratePreviewing(false);
    void stopBackingTrack();
    setPhase('calibrateOffset');
  }, []);

  const selectScope = useCallback((scope: DrumSongScope) => {
    setSongScope(scope);
    songScopeRef.current = scope;
    setDemoJustFinished(false);
    setPhase('pickLevel');
  }, []);

  const selectPlayMode = useCallback(
    (mode: PlayMode) => {
      setPlayMode(mode);
      playModeRef.current = mode;

      if (mode === 'drums') {
        setPhase('pickLevel');
        return;
      }

      // fullBand
      if (!songHasBackingAudio(songRef.current?.backingTrack)) {
        setPhase('pickAudio');
        return;
      }

      if (hadSavedBindingRef.current) {
        setPhase('pickLevel');
        return;
      }

      enterCalibrate();
    },
    [enterCalibrate],
  );

  const pickBackingAudio = useCallback(
    async (sourceUri: string, fileNameHint?: string) => {
      const song = songRef.current;
      if (!song) {
        return { ok: false as const, code: 'noSong' as const };
      }

      setAudioBusy(true);
      try {
        const localUri = copySongAudioFile(song.id, sourceUri, fileNameHint);
        const eventsStartMs = song.backingTrack?.eventsStartMs ?? 0;
        await saveSongAudioBinding({
          songId: song.id,
          localUri,
          eventsStartMs,
        });

        const next: DrumSongDefinition = {
          ...song,
          backingTrack: {
            ...(song.backingTrack?.module != null
              ? { module: song.backingTrack.module }
              : {}),
            uri: localUri,
            eventsStartMs,
          },
        };
        applySong(next);
        hadSavedBindingRef.current = false;
        setCalibrateOffsetMs(eventsStartMs);
        setPhase('calibrateOffset');
        return { ok: true as const };
      } catch {
        return { ok: false as const, code: 'readFailed' as const };
      } finally {
        setAudioBusy(false);
      }
    },
    [applySong],
  );

  const setCalibrateOffset = useCallback((ms: number) => {
    setCalibrateOffsetMs(clampOffset(ms));
  }, []);

  const previewCalibrate = useCallback(async () => {
    const song = songRef.current;
    if (!songHasBackingAudio(song?.backingTrack)) {
      return;
    }

    clearTimers();
    setCalibratePreviewing(true);
    const offset = clampOffset(calibrateOffsetMs);
    const previewTrack = {
      ...song!.backingTrack!,
      eventsStartMs: offset,
    };

    try {
      await prepareSamplePlayback();
      await prepareBackingTrack(previewTrack);
      await playBackingFrom(Math.max(0, offset));

      const firstHits = song!.events.slice(0, 8);
      firstHits.forEach((event) => {
        const timer = setTimeout(() => {
          if (phaseRef.current !== 'calibrateOffset') {
            return;
          }
          playHit(event.padId);
          setGuidePadId(event.padId);
        }, event.atMs);
        timersRef.current.push(timer);
      });

      const endTimer = setTimeout(() => {
        void stopBackingTrack();
        setGuidePadId(null);
        setCalibratePreviewing(false);
      }, CALIBRATE_PREVIEW_MS);
      timersRef.current.push(endTimer);
    } catch {
      setCalibratePreviewing(false);
      void stopBackingTrack();
    }
  }, [calibrateOffsetMs, clearTimers, playHit]);

  const stopCalibratePreview = useCallback(() => {
    clearTimers();
    void stopBackingTrack();
    setGuidePadId(null);
    setCalibratePreviewing(false);
  }, [clearTimers]);

  const confirmCalibrate = useCallback(async () => {
    const song = songRef.current;
    if (!song || !songHasBackingAudio(song.backingTrack)) {
      return;
    }

    stopCalibratePreview();
    const eventsStartMs = clampOffset(calibrateOffsetMs);
    const localUri = song.backingTrack!.uri;
    if (localUri) {
      await saveSongAudioBinding({
        songId: song.id,
        localUri,
        eventsStartMs,
      });
    }

    const next: DrumSongDefinition = {
      ...song,
      backingTrack: {
        ...song.backingTrack!,
        eventsStartMs,
      },
    };
    applySong(next);
    hadSavedBindingRef.current = true;
    onUserSongOffsetSaved?.(song.id, eventsStartMs);
    setPhase('pickLevel');
  }, [
    applySong,
    calibrateOffsetMs,
    onUserSongOffsetSaved,
    stopCalibratePreview,
  ]);

  const selectLevel = useCallback(
    (nextLevel: SupportLevel) => {
      setLevel(nextLevel);
      levelRef.current = nextLevel;
      setDemoJustFinished(false);

      if (nextLevel === 'guided') {
        void startDemo();
        return;
      }
      if (nextLevel === 'medium') {
        void startStepMode();
        return;
      }
      void startCountdown();
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
    if (phase === 'pickMode') {
      setPlayMode('drums');
      playModeRef.current = 'drums';
      setPhase('pickScope');
      return;
    }
    if (phase === 'pickAudio') {
      setPhase('pickMode');
      return;
    }
    if (phase === 'calibrateOffset') {
      stopCalibratePreview();
      setPhase('pickMode');
      return;
    }
    if (phase === 'pickLevel') {
      setPhase('pickScope');
      setDemoJustFinished(false);
      clearTimers();
      stopSessionAudio();
      return;
    }
    if (phase === 'results') {
      setPhase('pickLevel');
      setResults(null);
    }
  }, [clearTimers, phase, stopCalibratePreview, stopSessionAudio]);

  const backToSongList = useCallback(() => {
    clearTimers();
    stopSessionAudio();
    setSelectedSong(null);
    songRef.current = null;
    sessionRef.current = null;
    eventsRef.current = [];
    setPlayMode(null);
    setSongScope(null);
    setResults(null);
    setGuidePadId(null);
    setDemoJustFinished(false);
    setPhase('pickSong');
  }, [clearTimers, stopSessionAudio]);

  const replay = useCallback(() => {
    setResults(null);
    setDemoJustFinished(false);
    setPhase('pickLevel');
  }, []);

  /**
   * Charts can stack several pads on the same timestamp (crash + kick on a
   * downbeat). Those form a "simultaneous group" that may be hit in any
   * order: if the pressed pad matches any group member, that member is
   * swapped to the pointer position and counted as the hit.
   */
  const matchInSimultaneousGroup = useCallback(
    (padId: DrumSoundId): number => {
      const events = eventsRef.current;
      const idx = pointerRef.current;
      const groupAtMs = events[idx]?.atMs;
      if (groupAtMs === undefined) {
        return -1;
      }
      for (let i = idx; i < events.length && events[i].atMs === groupAtMs; i++) {
        if (events[i].padId === padId) {
          return i;
        }
      }
      return -1;
    },
    [],
  );

  const acceptHit = useCallback(
    (matchIndex: number) => {
      const events = eventsRef.current;
      const idx = pointerRef.current;
      if (matchIndex !== idx) {
        const tmp = events[matchIndex];
        events[matchIndex] = events[idx];
        events[idx] = tmp;
      }
      statsRef.current.hits += 1;
      advancePointer();
    },
    [advancePointer],
  );

  const handlePadPress = useCallback(
    (padId: DrumSoundId) => {
      if (phaseRef.current === 'demo') {
        return;
      }
      if (phaseRef.current !== 'playing') {
        playHit(padId);
        return;
      }

      const events = eventsRef.current;
      const idx = pointerRef.current;
      const expected = events[idx];
      if (!expected) {
        return;
      }

      playHit(padId);
      const matchIndex = matchInSimultaneousGroup(padId);

      if (levelRef.current === 'medium') {
        if (matchIndex >= 0) {
          acceptHit(matchIndex);
        } else {
          statsRef.current.wrongPresses += 1;
        }
        return;
      }

      // free
      const hitWindow =
        playModeRef.current === 'fullBand' ? HIT_WINDOW_BAND_MS : HIT_WINDOW_MS;
      const elapsed = getElapsedMs();
      const delta = Math.abs(elapsed - expected.atMs);
      if (matchIndex >= 0 && delta <= hitWindow) {
        acceptHit(matchIndex);
      } else if (matchIndex < 0) {
        statsRef.current.wrongPresses += 1;
      }
      // Correct pad outside the window: no penalty here — if it stays unhit,
      // the tick loop scores it as a single miss (no double punishment).
    },
    [acceptHit, getElapsedMs, matchInSimultaneousGroup, playHit],
  );

  const isActive = phase !== 'idle';
  const songs = [...DRUM_SONGS, ...extraSongs];

  const isListeningOutro =
    playMode === 'fullBand' &&
    phase === 'playing' &&
    progress.total > 0 &&
    progress.resolved >= progress.total;

  const hasBackingAudio = songHasBackingAudio(selectedSong?.backingTrack);

  return {
    phase,
    selectedSong,
    playMode,
    songScope,
    level,
    tempo,
    countdownValue,
    guidePadId,
    progress,
    results,
    demoJustFinished,
    isActive,
    isListeningOutro,
    hasBackingAudio,
    calibrateOffsetMs,
    calibratePreviewing,
    audioBusy,
    offsetMinMs: OFFSET_MIN_MS,
    offsetMaxMs: OFFSET_MAX_MS,
    songs,
    open,
    close,
    selectSong,
    selectPlayMode,
    selectScope,
    selectLevel,
    setTempo,
    goBack,
    backToSongList,
    replay,
    handlePadPress,
    pickBackingAudio,
    setCalibrateOffset,
    previewCalibrate,
    stopCalibratePreview,
    confirmCalibrate,
  };
}
