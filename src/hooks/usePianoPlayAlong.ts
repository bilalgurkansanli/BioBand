import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { awardPlayAlongCompletion } from '../profile/awardPlayAlong';
import type { NoteId } from '../instruments/piano/pianoNotes';
import { getSongById, PIANO_SONGS } from '../instruments/piano/songs/catalog';
import {
  resolvePlaySession,
  type ResolvedPlaySession,
} from '../instruments/piano/songs/resolvePlaySession';
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
import {
  songHasBackingAudio,
  type PlayMode,
  type SongDefinition,
  type SongEvent,
  type SongScope,
} from '../instruments/piano/songs/types';
import { getSharedAudioContext, prepareSamplePlayback } from '../audio/sampleBank';
import {
  startSongScheduler,
  type SongSchedulerHandle,
} from '../audio/songScheduler';
import {
  melodyEvents,
  resolveDurations,
  resolveVelocities,
  roleOf,
  type NotePerformance,
} from '../instruments/shared/songPerformance';
import {
  copySongAudioFile,
  copySongPianoLessFile,
  getSongAudioBinding,
  mergeSongWithAudioBinding,
  saveSongAudioBinding,
} from '../storage/songAudioBindingsStorage';

export type { PlayMode, SongScope };
export type SupportLevel = 'guided' | 'medium' | 'free';
export type PlayTempo = 'slow' | 'normal' | 'fast';

export const TEMPO_RATES: Record<PlayTempo, number> = {
  slow: 0.75,
  normal: 1,
  fast: 1.25,
};

export type PlayAlongPhase =
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

export type PlayAlongResults = {
  totalNotes: number;
  hits: number;
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

export function usePianoPlayAlong(
  playNote: (noteId: NoteId, performance?: NotePerformance) => void,
  extraSongs: SongDefinition[] = [],
  onUserSongOffsetSaved?: (songId: string, eventsStartMs: number) => void,
) {
  const [phase, setPhase] = useState<PlayAlongPhase>('idle');
  const [selectedSong, setSelectedSong] = useState<SongDefinition | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);
  const [songScope, setSongScope] = useState<SongScope | null>(null);
  const [level, setLevel] = useState<SupportLevel>('guided');
  const [tempo, setTempoState] = useState<PlayTempo>('normal');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START);
  const [guideNoteId, setGuideNoteId] = useState<NoteId | null>(null);
  const [progress, setProgress] = useState<PlayAlongProgress>({
    resolved: 0,
    total: 0,
    hits: 0,
  });
  const [results, setResults] = useState<PlayAlongResults | null>(null);
  const [calibrateOffsetMs, setCalibrateOffsetMs] = useState(0);
  const [calibratePreviewing, setCalibratePreviewing] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);

  const songRef = useRef<SongDefinition | null>(null);
  const sessionRef = useRef<ResolvedPlaySession | null>(null);
  /** Everything that sounds, accompaniment included. */
  const eventsRef = useRef<SongEvent[]>([]);
  /** Only what the user is asked to play — drives the guide and the score. */
  const chartRef = useRef<SongEvent[]>([]);
  /** Sustain and strike strength per entry of `eventsRef`. */
  const durationsRef = useRef<number[]>([]);
  const velocitiesRef = useRef<number[]>([]);
  const schedulerRef = useRef<SongSchedulerHandle | null>(null);
  const playModeRef = useRef<PlayMode | null>(null);
  const songScopeRef = useRef<SongScope | null>(null);
  const levelRef = useRef<SupportLevel>('guided');
  const tempoRef = useRef<PlayTempo>('normal');
  const phaseRef = useRef<PlayAlongPhase>('idle');
  const extraSongsRef = useRef(extraSongs);
  extraSongsRef.current = extraSongs;
  const startTimeRef = useRef(0);
  const pointerRef = useRef(0);
  const statsRef = useRef({ hits: 0, misses: 0, wrongPresses: 0 });
  /** True after a guided demo ends, until the user picks a play level. */
  const [demoJustFinished, setDemoJustFinished] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const notesFinishedRef = useRef(false);
  /**
   * Bumped by every start attempt. The starters await before installing their
   * timers, so without this a second tap (double-tapped level or Replay)
   * interleaves with the first and both sets of timers survive — leaving an
   * orphaned scheduler that `clearTimers` can no longer reach.
   */
  const runIdRef = useRef(0);
  /** True when user already had a saved binding (skip calibrate on re-entry). */
  const hadSavedBindingRef = useRef(false);

  phaseRef.current = phase;
  playModeRef.current = playMode;
  songScopeRef.current = songScope;
  tempoRef.current = tempo;

  const clearTimers = useCallback(() => {
    if (schedulerRef.current) {
      schedulerRef.current.stop();
      schedulerRef.current = null;
    }
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

  const clearGuides = useCallback(() => {
    setGuideNoteId(null);
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      void stopBackingTrack();
    };
  }, [clearTimers]);

  const applySong = useCallback((song: SongDefinition) => {
    setSelectedSong(song);
    songRef.current = song;
  }, []);

  const getElapsedMs = useCallback(() => {
    const session = sessionRef.current;
    if (session?.useBacking) {
      // Backing player.playbackRate keeps currentTime in song-time.
      return getBackingElapsedMs(session.audioStartMs);
    }
    // The audio clock is the one the notes are actually placed on. Wall time
    // drifts against it under render load, which is exactly when the hit
    // windows must not move.
    const elapsed =
      (getSharedAudioContext().currentTime - startTimeRef.current) * 1000;
    return elapsed * TEMPO_RATES[tempoRef.current];
  }, []);

  const updateGuide = useCallback(() => {
    const events = chartRef.current;
    if (events.length === 0 || pointerRef.current >= events.length) {
      clearGuides();
      return;
    }
    if (levelRef.current === 'free' && playModeRef.current !== 'fullBand') {
      clearGuides();
      return;
    }
    setGuideNoteId(events[pointerRef.current]?.noteId ?? null);
  }, [clearGuides]);

  const finishSong = useCallback(() => {
    clearTimers();
    stopSessionAudio();
    clearGuides();

    const events = chartRef.current;
    const stats = statsRef.current;
    const totalNotes = events.length;
    const scored =
      stats.hits + stats.misses + stats.wrongPresses;
    const accuracy = scored > 0 ? stats.hits / scored : 0;
    const stars = computeStars(accuracy);

    setResults({
      totalNotes,
      hits: stats.hits,
      misses: stats.misses,
      wrongPresses: stats.wrongPresses,
      accuracy,
      stars,
    });

    void awardPlayAlongCompletion({
      instrument: 'piano',
      songId: songRef.current?.id ?? null,
      stars,
      elapsedMs: Math.min(Math.max(0, getElapsedMs()), MAX_AWARD_ELAPSED_MS),
    });

    const timer = setTimeout(() => {
      setPhase('results');
    }, RESULTS_DELAY_MS);
    timersRef.current.push(timer);
  }, [clearGuides, clearTimers, getElapsedMs, stopSessionAudio]);

  const maybeFinishAfterNotes = useCallback(() => {
    const session = sessionRef.current;
    const events = chartRef.current;
    if (pointerRef.current < events.length) {
      return;
    }
    notesFinishedRef.current = true;
    clearGuides();

    if (session?.useBacking && songScopeRef.current === 'full') {
      return;
    }
    if (session?.useBacking && songScopeRef.current === 'partial') {
      return;
    }
    finishSong();
  }, [clearGuides, finishSong]);

  const advancePointer = useCallback(() => {
    pointerRef.current += 1;
    updateGuide();

    const events = chartRef.current;
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
    // Accompaniment sounds but is never highlighted or scored — the user is
    // still only asked to play the tune.
    chartRef.current = melodyEvents(session.events);
    durationsRef.current = resolveDurations(session.events, {
      isSameNote: (a, b) => a.noteId === b.noteId,
    });
    velocitiesRef.current = resolveVelocities(session.events, song.meter);
    return session;
  }, []);

  /** Length and strength written for the event at `index` of `eventsRef`. */
  const performanceFor = useCallback(
    (index: number, atTime?: number): NotePerformance => {
      const durationMs = durationsRef.current[index];
      return {
        atTime,
        sustainSeconds: durationMs ? durationMs / 1000 : undefined,
        velocity: velocitiesRef.current[index],
        transposeSemitones: eventsRef.current[index]?.transpose,
      };
    },
    [],
  );

  const finishDemo = useCallback(() => {
    clearTimers();
    stopSessionAudio();
    clearGuides();
    setDemoJustFinished(true);
    setPhase('pickLevel');
  }, [clearGuides, clearTimers, stopSessionAudio]);

  const ensureBackingReady = useCallback(
    async (session: ResolvedPlaySession) => {
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
      const events = chartRef.current;
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
    startTimeRef.current = getSharedAudioContext().currentTime;
    pointerRef.current = 0;
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: chartRef.current.length, hits: 0 });
    setPhase('playing');
    updateGuide();

    if (session.useBacking) {
      void playBackingFrom(session.audioStartMs);
    } else {
      // The user plays the tune; anything written as accompaniment plays
      // underneath so they hear the song rather than a bare melody line.
      const accompaniment = session.events
        .map((event, index) => ({ event, index }))
        .filter((entry) => roleOf(entry.event) !== 'melody');

      if (accompaniment.length > 0) {
        schedulerRef.current?.stop();
        schedulerRef.current = startSongScheduler({
          events: accompaniment.map((entry) => entry.event),
          rate: TEMPO_RATES[tempoRef.current],
          onEvent: (event, position, atContextTime) => {
            playNote(
              event.noteId,
              performanceFor(accompaniment[position].index, atContextTime),
            );
          },
        });
      }
    }
    startTick();
  }, [buildSession, performanceFor, playNote, startTick, updateGuide]);

  const startDemo = useCallback(async () => {
    const runId = ++runIdRef.current;
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
    setProgress({ resolved: 0, total: chartRef.current.length, hits: 0 });
    setPhase('demo');
    setGuideNoteId(chartRef.current[0]?.noteId ?? null);

    await ensureBackingReady(session);
    if (runIdRef.current !== runId) {
      return;
    }

    const rate = TEMPO_RATES[tempoRef.current];

    if (session.useBacking) {
      await playBackingFrom(session.audioStartMs);
      if (runIdRef.current !== runId) {
        return;
      }
      startTimeRef.current = getSharedAudioContext().currentTime;

      tickRef.current = setInterval(() => {
        if (phaseRef.current !== 'demo') {
          return;
        }
        const elapsed = getElapsedMs();
        const events = chartRef.current;
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
          finishDemo();
        }
      }, TICK_MS);
      return;
    }

    startTimeRef.current = getSharedAudioContext().currentTime;

    const chart = chartRef.current;
    let reached = 0;

    schedulerRef.current?.stop();
    schedulerRef.current = startSongScheduler({
      events: session.events,
      rate,
      onEvent: (event, index, atContextTime) => {
        playNote(event.noteId, performanceFor(index, atContextTime));
      },
      onAdvance: (_index, event) => {
        while (reached < chart.length && chart[reached].atMs <= event.atMs) {
          reached += 1;
        }
        const current = Math.max(0, reached - 1);
        pointerRef.current = current;
        setGuideNoteId(chart[current]?.noteId ?? null);
        setProgress({ resolved: reached, total: chart.length, hits: 0 });
      },
      onDone: finishDemo,
    });
  }, [
    buildSession,
    clearTimers,
    ensureBackingReady,
    finishDemo,
    getElapsedMs,
    performanceFor,
    playNote,
  ]);

  const startStepMode = useCallback(async () => {
    const runId = ++runIdRef.current;
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    notesFinishedRef.current = false;
    // Without this, finishing step mode with no backing track computed the
    // award elapsed from a stale/zero start (same bug fixed in drums/guitar/pads).
    startTimeRef.current = getSharedAudioContext().currentTime;
    pointerRef.current = 0;
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: chartRef.current.length, hits: 0 });
    setPhase('playing');
    updateGuide();

    await ensureBackingReady(session);
    if (runIdRef.current !== runId) {
      return;
    }
    if (session.useBacking) {
      await playBackingFrom(session.audioStartMs);
      if (runIdRef.current !== runId) {
        return;
      }
      startTick();
    }
  }, [buildSession, clearTimers, ensureBackingReady, startTick, updateGuide]);

  const startCountdown = useCallback(async () => {
    const runId = ++runIdRef.current;
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    setCountdownValue(COUNTDOWN_START);
    setPhase('countdown');
    clearGuides();

    await ensureBackingReady(session);
    if (runIdRef.current !== runId) {
      return;
    }

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
  }, [buildSession, clearGuides, clearTimers, ensureBackingReady, startPlaying]);

  const resetWizardSong = useCallback(() => {
    clearTimers();
    stopSessionAudio();
    setSelectedSong(null);
    songRef.current = null;
    sessionRef.current = null;
    eventsRef.current = [];
    chartRef.current = [];
    durationsRef.current = [];
    velocitiesRef.current = [];
    setPlayMode(null);
    setSongScope(null);
    setResults(null);
    clearGuides();
    setDemoJustFinished(false);
    setCalibrateOffsetMs(0);
    setCalibratePreviewing(false);
    hadSavedBindingRef.current = false;
  }, [clearGuides, clearTimers, stopSessionAudio]);

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
        getSongById(songId) ??
        extraSongsRef.current.find((entry) => entry.id === songId);
      if (!base) {
        return;
      }

      // Piano play-along: excerpt vs full chart, then piano-only vs band.
      const merged = await mergeSongWithAudioBinding(base);
      applySong(merged);
      hadSavedBindingRef.current = songHasBackingAudio(merged.backingTrack);
      setPlayMode('piano');
      playModeRef.current = 'piano';
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

  /** Band play skips level selection — always free play over the mix. */
  const startBandPlay = useCallback(() => {
    setLevel('free');
    levelRef.current = 'free';
    void startCountdown();
  }, [startCountdown]);

  const selectPlayMode = useCallback(
    (mode: PlayMode) => {
      setPlayMode(mode);
      playModeRef.current = mode;

      if (mode === 'piano') {
        setPhase('pickLevel');
        return;
      }

      // fullBand
      if (!songHasBackingAudio(songRef.current?.backingTrack)) {
        setPhase('pickAudio');
        return;
      }

      if (hadSavedBindingRef.current) {
        startBandPlay();
        return;
      }

      enterCalibrate();
    },
    [enterCalibrate, startBandPlay],
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

        const next: SongDefinition = {
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

  /**
   * Pick a piano-less (karaoke / stem) file. Saves it alongside the existing
   * full-mix binding so the backing player auto-prefers it during playback.
   */
  const pickPianoLessBacking = useCallback(
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
        const pianoLessLocalUri = copySongPianoLessFile(
          song.id,
          sourceUri,
          fileNameHint,
        );

        // Preserve existing full-mix binding if any.
        const existingBinding = await getSongAudioBinding(song.id);
        const localUri =
          existingBinding?.localUri ?? song.backingTrack?.uri ?? '';
        const eventsStartMs =
          song.backingTrack?.eventsStartMs ?? existingBinding?.eventsStartMs ?? 0;

        await saveSongAudioBinding({
          songId: song.id,
          localUri,
          eventsStartMs,
          pianoLessLocalUri,
        });

        const next: SongDefinition = {
          ...song,
          backingTrack: {
            ...(song.backingTrack ?? { eventsStartMs: 0 }),
            ...(localUri ? { uri: localUri } : {}),
            pianoLessUri: pianoLessLocalUri,
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

      // Light first few chart notes against wall clock for a rough feel.
      const firstNotes = song!.events.slice(0, 8);
      firstNotes.forEach((event) => {
        const timer = setTimeout(() => {
          if (phaseRef.current !== 'calibrateOffset') {
            return;
          }
          playNote(event.noteId);
          setGuideNoteId(event.noteId);
        }, event.atMs);
        timersRef.current.push(timer);
      });

      const endTimer = setTimeout(() => {
        void stopBackingTrack();
        clearGuides();
        setCalibratePreviewing(false);
      }, CALIBRATE_PREVIEW_MS);
      timersRef.current.push(endTimer);
    } catch {
      setCalibratePreviewing(false);
      void stopBackingTrack();
    }
  }, [calibrateOffsetMs, clearGuides, clearTimers, playNote]);

  const stopCalibratePreview = useCallback(() => {
    clearTimers();
    void stopBackingTrack();
    clearGuides();
    setCalibratePreviewing(false);
  }, [clearGuides, clearTimers]);

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

    const next: SongDefinition = {
      ...song,
      backingTrack: {
        ...song.backingTrack!,
        eventsStartMs,
      },
    };
    applySong(next);
    hadSavedBindingRef.current = true;
    onUserSongOffsetSaved?.(song.id, eventsStartMs);
    startBandPlay();
  }, [
    applySong,
    calibrateOffsetMs,
    onUserSongOffsetSaved,
    startBandPlay,
    stopCalibratePreview,
  ]);

  const openRecalibrate = useCallback(() => {
    enterCalibrate();
  }, [enterCalibrate]);

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
      return;
    }
    if (phase === 'pickMode') {
      setPlayMode('piano');
      playModeRef.current = 'piano';
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

  const handleNotePress = useCallback(
    (noteId: NoteId) => {
      const play = () => {
        playNote(noteId);
      };

      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        void ctx.resume().then(play);
      } else {
        play();
      }

      const events = chartRef.current;
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
      const hitWindow =
        playModeRef.current === 'fullBand' ? HIT_WINDOW_BAND_MS : HIT_WINDOW_MS;

      if (
        event &&
        noteId === event.noteId &&
        elapsed >= event.atMs - hitWindow &&
        elapsed <= event.atMs + hitWindow
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

  const isListeningOutro =
    playMode === 'fullBand' &&
    phase === 'playing' &&
    progress.total > 0 &&
    progress.resolved >= progress.total;

  const hasBackingAudio = songHasBackingAudio(selectedSong?.backingTrack);
  const hasPianoLessBacking = hasPianoLessTrack(selectedSong?.backingTrack);

  // Rebuilding this every render handed the screen a new array each time,
  // which was enough to invalidate the key-press callbacks and redraw all 24
  // keys on any unrelated state change.
  const songs = useMemo(
    () => [...PIANO_SONGS, ...extraSongs],
    [extraSongs],
  );

  return {
    songs,
    phase,
    selectedSong,
    playMode,
    songScope,
    level,
    tempo,
    countdownValue,
    guideNoteId,
    progress,
    results,
    demoJustFinished,
    isActive,
    isListeningOutro,
    hasBackingAudio,
    hasPianoLessBacking,
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
    handleNotePress,
    pickBackingAudio,
    pickPianoLessBacking,
    setCalibrateOffset,
    previewCalibrate,
    stopCalibratePreview,
    confirmCalibrate,
    openRecalibrate,
  };
}
