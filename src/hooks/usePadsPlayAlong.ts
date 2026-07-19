import { useCallback, useEffect, useRef, useState } from 'react';

import { awardPlayAlongCompletion } from '../profile/awardPlayAlong';
import type { PadSoundId } from '../instruments/pads/padsSounds';
import { getPadSongById, PAD_SONGS } from '../instruments/pads/songs/catalog';
import { resolvePadPlaySession } from '../instruments/pads/songs/resolvePlaySession';
import type {
  PadSongDefinition,
  PadSongEvent,
  PadSongScope,
  PlayMode,
  ResolvedPadSession,
} from '../instruments/pads/songs/types';
import { songHasBackingAudio } from '../instruments/piano/songs/types';
import {
  getBackingCurrentTimeMs,
  getBackingElapsedMs,
  hasPianoLessTrack,
  onBackingFinished,
  pauseBackingTrack,
  playBackingFrom,
  prepareBackingTrack,
  setBackingPlaybackRate,
  stopBackingTrack,
} from '../instruments/piano/songs/songBackingPlayer';
import { getSharedAudioContext, prepareSamplePlayback } from '../audio/sampleBank';
import {
  copySongAudioFile,
  copySongPianoLessFile,
  getSongAudioBinding,
  mergeSongWithAudioBinding,
  saveSongAudioBinding,
} from '../storage/songAudioBindingsStorage';

export type { PlayMode, PadSongScope };
export type SupportLevel = 'guided' | 'medium' | 'free';
export type PlayTempo = 'slow' | 'normal' | 'fast';

export const TEMPO_RATES: Record<PlayTempo, number> = {
  slow: 0.75,
  normal: 1,
  fast: 1.25,
};

export type PadsPlayAlongPhase =
  | 'idle'
  | 'pickSong'
  | 'pickMode'
  | 'pickAudio'
  | 'calibrateOffset'
  | 'pickScope'
  | 'pickLevel'
  | 'countdown'
  | 'demo'
  | 'playing'
  | 'results';

export type PadsPlayAlongResults = {
  totalNotes: number;
  hits: number;
  misses: number;
  wrongPresses: number;
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
};

export type PadsPlayAlongProgress = {
  resolved: number;
  total: number;
  hits: number;
};

const HIT_WINDOW_MS = 350;
/** Practice-time award ceiling — a stale clock must not bank hours. */
const MAX_AWARD_ELAPSED_MS = 30 * 60_000;
const HIT_WINDOW_BAND_MS = 480;
const TICK_MS = 60;
const COUNTDOWN_START = 3;
const COUNTDOWN_STEP_MS = 800;
const RESULTS_DELAY_MS = 700;
const CALIBRATE_PREVIEW_MS = 4500;
const OFFSET_MIN_MS = -5000;
const OFFSET_MAX_MS = 60_000;

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

export function usePadsPlayAlong(
  triggerPad: (id: PadSoundId) => void,
  extraSongs: PadSongDefinition[] = [],
  onUserSongOffsetSaved?: (songId: string, eventsStartMs: number) => void,
) {
  const [phase, setPhase] = useState<PadsPlayAlongPhase>('idle');
  const [selectedSong, setSelectedSong] = useState<PadSongDefinition | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);
  const [songScope, setSongScope] = useState<PadSongScope | null>(null);
  const [level, setLevel] = useState<SupportLevel>('guided');
  const [tempo, setTempoState] = useState<PlayTempo>('normal');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START);
  const [guidePadId, setGuidePadId] = useState<PadSoundId | null>(null);
  const [progress, setProgress] = useState<PadsPlayAlongProgress>({
    resolved: 0,
    total: 0,
    hits: 0,
  });
  const [results, setResults] = useState<PadsPlayAlongResults | null>(null);
  const [demoJustFinished, setDemoJustFinished] = useState(false);
  const [calibrateOffsetMs, setCalibrateOffsetMs] = useState(0);
  const [calibratePreviewing, setCalibratePreviewing] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);

  const songRef = useRef<PadSongDefinition | null>(null);
  const sessionRef = useRef<ResolvedPadSession | null>(null);
  const eventsRef = useRef<PadSongEvent[]>([]);
  const playModeRef = useRef<PlayMode | null>(null);
  const songScopeRef = useRef<PadSongScope | null>(null);
  const levelRef = useRef<SupportLevel>('guided');
  const tempoRef = useRef<PlayTempo>('normal');
  const phaseRef = useRef<PadsPlayAlongPhase>('idle');
  const extraSongsRef = useRef(extraSongs);
  extraSongsRef.current = extraSongs;
  const startTimeRef = useRef(0);
  const pointerRef = useRef(0);
  const statsRef = useRef({ hits: 0, misses: 0, wrongPresses: 0 });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const notesFinishedRef = useRef(false);
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

  const applySong = useCallback((song: PadSongDefinition) => {
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

    void awardPlayAlongCompletion({
      instrument: 'pads',
      songId: songRef.current?.id ?? null,
      stars,
      elapsedMs: Math.max(0, Math.min(getElapsedMs(), MAX_AWARD_ELAPSED_MS)),
    });

    const timer = setTimeout(() => {
      setPhase('results');
    }, RESULTS_DELAY_MS);
    timersRef.current.push(timer);
  }, [clearTimers, getElapsedMs, stopSessionAudio]);

  const maybeFinishAfterNotes = useCallback(() => {
    const session = sessionRef.current;
    const events = eventsRef.current;
    if (pointerRef.current < events.length) {
      return;
    }
    notesFinishedRef.current = true;
    setGuidePadId(null);

    if (session?.useBacking && songScopeRef.current === 'full') {
      return;
    }
    if (session?.useBacking && songScopeRef.current === 'partial') {
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

  const buildSession = useCallback((): ResolvedPadSession | null => {
    const song = songRef.current;
    const mode = playModeRef.current;
    const scope = songScopeRef.current;
    if (!song || !mode || !scope) {
      return null;
    }
    const session = resolvePadPlaySession(song, mode, scope);
    sessionRef.current = session;
    eventsRef.current = session.events;
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
    async (session: ResolvedPadSession) => {
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
        triggerPad(event.padId);
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
    triggerPad,
  ]);

  const startStepMode = useCallback(async () => {
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    notesFinishedRef.current = false;
    // Without this, finishing step mode with no backing track computed the
    // award elapsed from a stale/zero start (same bug fixed in drums/guitar).
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
    setGuidePadId(null);
    setDemoJustFinished(false);
    setCalibrateOffsetMs(0);
    setCalibratePreviewing(false);
    hadSavedBindingRef.current = false;
  }, [clearTimers, stopSessionAudio]);

  const open = useCallback(() => {
    resetWizardSong();
    setPhase('pickSong');
  }, [resetWizardSong]);

  const close = useCallback(() => {
    resetWizardSong();
    setPhase('idle');
  }, [resetWizardSong]);

  const selectSong = useCallback(
    async (songId: string) => {
      const base =
        getPadSongById(songId) ??
        extraSongsRef.current.find((entry) => entry.id === songId);
      if (!base) {
        return;
      }

      const merged = (await mergeSongWithAudioBinding(
        base as unknown as Parameters<typeof mergeSongWithAudioBinding>[0],
      )) as unknown as PadSongDefinition;
      applySong(merged);
      hadSavedBindingRef.current = songHasBackingAudio(merged.backingTrack);
      setPlayMode('pads');
      playModeRef.current = 'pads';
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

  const selectPlayMode = useCallback(
    (mode: PlayMode) => {
      setPlayMode(mode);
      playModeRef.current = mode;

      if (mode === 'pads') {
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

        const next: PadSongDefinition = {
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

  const pickPadLessBacking = useCallback(
    async (
      sourceUri: string,
      fileNameHint?: string,
    ): Promise<{ ok: true } | { ok: false; code: string }> => {
      const song = songRef.current;
      if (!song) {
        return { ok: false, code: 'noSong' };
      }

      setAudioBusy(true);
      try {
        const padLessLocalUri = copySongPianoLessFile(
          song.id,
          sourceUri,
          fileNameHint,
        );

        const existingBinding = await getSongAudioBinding(song.id);
        const localUri =
          existingBinding?.localUri ?? song.backingTrack?.uri ?? '';
        const eventsStartMs =
          song.backingTrack?.eventsStartMs ?? existingBinding?.eventsStartMs ?? 0;

        await saveSongAudioBinding({
          songId: song.id,
          localUri,
          eventsStartMs,
          pianoLessLocalUri: padLessLocalUri,
        });

        const next: PadSongDefinition = {
          ...song,
          backingTrack: {
            ...(song.backingTrack ?? { eventsStartMs: 0 }),
            ...(localUri ? { uri: localUri } : {}),
            pianoLessUri: padLessLocalUri,
            eventsStartMs,
          },
        };
        applySong(next);
        return { ok: true };
      } catch {
        return { ok: false, code: 'readFailed' };
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

      const firstNotes = song!.events.slice(0, 8);
      firstNotes.forEach((event) => {
        const timer = setTimeout(() => {
          if (phaseRef.current !== 'calibrateOffset') {
            return;
          }
          triggerPad(event.padId);
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
  }, [calibrateOffsetMs, clearTimers, triggerPad]);

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

    const next: PadSongDefinition = {
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

  const openRecalibrate = useCallback(() => {
    enterCalibrate();
  }, [enterCalibrate]);

  const selectScope = useCallback((scope: PadSongScope) => {
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
      setDemoJustFinished(false);
      setLevel(nextLevel);
      levelRef.current = nextLevel;
      startForLevel(nextLevel);
    },
    [startForLevel],
  );

  const setTempo = useCallback((next: PlayTempo) => {
    setTempoState(next);
    tempoRef.current = next;
  }, []);

  const backToSongList = useCallback(() => {
    clearTimers();
    stopSessionAudio();
    setPlayMode(null);
    setSongScope(null);
    setPhase('pickSong');
  }, [clearTimers, stopSessionAudio]);

  const goBack = useCallback(() => {
    if (phase === 'pickScope') {
      setSongScope(null);
      setPhase('pickSong');
      setSelectedSong(null);
      songRef.current = null;
      return;
    }
    if (phase === 'pickMode') {
      setPlayMode(null);
      playModeRef.current = 'pads';
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
    if (phase === 'pickLevel' || phase === 'results') {
      setDemoJustFinished(false);
      clearTimers();
      stopSessionAudio();
      if (phase === 'results') {
        setPhase('pickLevel');
        return;
      }
      setPhase('pickScope');
    }
  }, [clearTimers, phase, stopCalibratePreview, stopSessionAudio]);

  const replay = useCallback(() => {
    if (!songRef.current) {
      return;
    }
    startForLevel(levelRef.current);
  }, [startForLevel]);

  const handlePadPress = useCallback(
    (padId: PadSoundId) => {
      const play = () => {
        triggerPad(padId);
      };

      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        void ctx.resume().then(play);
      } else {
        play();
      }

      const events = eventsRef.current;
      if (!events.length || phaseRef.current !== 'playing') {
        return;
      }

      const event = events[pointerRef.current];

      if (levelRef.current === 'medium') {
        if (event && padId === event.padId) {
          statsRef.current.hits += 1;
          advancePointer();
        } else {
          statsRef.current.wrongPresses += 1;
        }
        return;
      }

      const elapsed = getElapsedMs();
      const hitWindow =
        playModeRef.current === 'fullBand' ? HIT_WINDOW_BAND_MS : HIT_WINDOW_MS;

      if (
        event &&
        padId === event.padId &&
        elapsed >= event.atMs - hitWindow &&
        elapsed <= event.atMs + hitWindow
      ) {
        statsRef.current.hits += 1;
        advancePointer();
      } else {
        statsRef.current.wrongPresses += 1;
      }
    },
    [advancePointer, getElapsedMs, triggerPad],
  );

  const isActive =
    phase === 'countdown' || phase === 'demo' || phase === 'playing';

  const isListeningOutro =
    playMode === 'fullBand' &&
    phase === 'playing' &&
    progress.total > 0 &&
    progress.resolved >= progress.total;

  const hasBackingAudio = songHasBackingAudio(selectedSong?.backingTrack);
  const hasPadLessBacking = hasPianoLessTrack(selectedSong?.backingTrack);

  return {
    songs: [...PAD_SONGS, ...extraSongs],
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
    hasPadLessBacking,
    calibrateOffsetMs,
    calibratePreviewing,
    audioBusy,
    offsetMinMs: OFFSET_MIN_MS,
    offsetMaxMs: OFFSET_MAX_MS,
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
    pickPadLessBacking,
    setCalibrateOffset,
    previewCalibrate,
    stopCalibratePreview,
    confirmCalibrate,
    openRecalibrate,
  };
}
