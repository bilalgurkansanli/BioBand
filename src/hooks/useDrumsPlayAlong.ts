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
import { getSharedAudioContext, prepareSamplePlayback } from '../audio/sampleBank';
import {
  startSongScheduler,
  type SongSchedulerHandle,
} from '../audio/songScheduler';
import {
  melodyEvents,
  resolveVelocities,
  roleOf,
  type NotePerformance,
} from '../instruments/shared/songPerformance';
import {
  applyHit,
  sessionElapsedMs,
  summarizeResults,
  HIT_WINDOW_BAND_MS,
  HIT_WINDOW_MS,
  judgeStepPress,
  judgeTimedPress,
} from '../instruments/shared/playAlongScoring';
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

const TICK_MS = 60;
const COUNTDOWN_START = 3;
const COUNTDOWN_STEP_MS = 800;
const RESULTS_DELAY_MS = 700;
const CALIBRATE_PREVIEW_MS = 4500;
const OFFSET_MIN_MS = -5000;
const OFFSET_MAX_MS = 60_000;

const padIdOf = (event: { padId: string }) => event.padId;

function clampOffset(ms: number): number {
  return Math.max(OFFSET_MIN_MS, Math.min(OFFSET_MAX_MS, Math.round(ms)));
}

export function useDrumsPlayAlong(
  playHit: (
    id: DrumSoundId,
    velocity?: number,
    performance?: NotePerformance,
  ) => void,
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
  /** Everything that sounds, accompaniment included. */
  const eventsRef = useRef<DrumSongEvent[]>([]);
  /** Only what the user is asked to play — drives the guide and the score. */
  const chartRef = useRef<DrumSongEvent[]>([]);
  /**
   * Strike strength per entry of `eventsRef`. A struck drum has no written
   * length — the sample rings for as long as the kit says — so unlike the
   * pitched instruments there is no sustain to resolve here.
   */
  const velocitiesRef = useRef<number[]>([]);
  const schedulerRef = useRef<SongSchedulerHandle | null>(null);
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
  /** Set once a session has been scored; cleared by every start. */
  const finishedRef = useRef(false);
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

  /**
   * Stop whatever is running or about to run. The starters await audio
   * loading before they install timers or start the backing track; bumping
   * the run id makes any of them still in flight bail out, instead of
   * starting a session nobody is in (Stop during a band demo load used to
   * start the track anyway and leave a tick interval running for good).
   */
  const cancelSession = useCallback(() => {
    runIdRef.current += 1;
    clearTimers();
    stopSessionAudio();
  }, [clearTimers, stopSessionAudio]);

  useEffect(() => {
    const runId = runIdRef;
    return () => {
      // Leaving the screen mid-load must not start the session afterwards.
      runId.current += 1;
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
    // The audio clock is the one the hits are actually placed on. Wall time
    // drifts against it under render load, which is exactly when the hit
    // windows must not move.
    const elapsed =
      (getSharedAudioContext().currentTime - startTimeRef.current) * 1000;
    return elapsed * TEMPO_RATES[tempoRef.current];
  }, []);

  const updateGuide = useCallback(() => {
    const events = chartRef.current;
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
    // The backing track ending and the tick loop can both get here; a session
    // is scored and awarded once.
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    clearTimers();
    stopSessionAudio();
    setGuidePadId(null);

    // Whatever is still unplayed when the session ends is a miss. A band track
    // running out used to end the song without counting them: one correct
    // note, then let the track play, scored 100% and three stars.
    const events = chartRef.current;
    if (pointerRef.current < events.length) {
      statsRef.current.misses += events.length - pointerRef.current;
      pointerRef.current = events.length;
      setProgress({
        resolved: events.length,
        total: events.length,
        hits: statsRef.current.hits,
      });
    }

    const results = summarizeResults(statsRef.current, events.length);
    setResults(results);

    void awardPlayAlongCompletion({
      instrument: 'drums',
      songId: songRef.current?.id ?? null,
      stars: results.stars,
      elapsedMs: sessionElapsedMs(
        startTimeRef.current,
        getSharedAudioContext().currentTime,
      ),
    });

    const timer = setTimeout(() => {
      setPhase('results');
    }, RESULTS_DELAY_MS);
    timersRef.current.push(timer);
  }, [clearTimers, stopSessionAudio]);

  const maybeFinishAfterNotes = useCallback(() => {
    const session = sessionRef.current;
    const events = chartRef.current;
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

  /** Guide, progress and the end-of-chart check, after the pointer moved. */
  const pointerMoved = useCallback(() => {
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

  const advancePointer = useCallback(() => {
    pointerRef.current += 1;
    pointerMoved();
  }, [pointerMoved]);

  /** Score a judged hit: notes it passed over become misses, then move on. */
  const acceptHit = useCallback(
    (judgement: { index: number; skipped: number }) => {
      const state = { pointer: pointerRef.current, ...statsRef.current };
      applyHit(chartRef.current, state, judgement);
      pointerRef.current = state.pointer;
      statsRef.current = {
        hits: state.hits,
        misses: state.misses,
        wrongPresses: state.wrongPresses,
      };
      pointerMoved();
    },
    [pointerMoved],
  );

  const buildSession = useCallback((): ResolvedDrumSession | null => {
    const song = songRef.current;
    const mode = playModeRef.current;
    const scope = songScopeRef.current;
    if (!song || !mode || !scope) {
      return null;
    }
    const session = resolveDrumPlaySession(song, mode, scope);
    sessionRef.current = session;
    eventsRef.current = session.events;
    // Accompaniment sounds but is never highlighted or scored — the user is
    // still only asked to play the part in front of them. `melodyEvents`
    // returns a fresh array, which the simultaneous-hit matching below is free
    // to reorder; the catalog's own arrays must never be mutated.
    chartRef.current = melodyEvents(session.events);
    velocitiesRef.current = resolveVelocities(session.events, song.meter);
    return session;
  }, []);

  /** Strike strength written for the event at `index` of `eventsRef`. */
  const performanceFor = useCallback(
    (index: number, atTime?: number): NotePerformance => ({
      atTime,
      velocity: velocitiesRef.current[index],
    }),
    [],
  );

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
        // finishSong scores whatever is still unplayed as missed.
        pauseBackingTrack();
        finishSong();
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
    finishedRef.current = false;
    startTimeRef.current = getSharedAudioContext().currentTime;
    pointerRef.current = 0;
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: chartRef.current.length, hits: 0 });
    setPhase('playing');
    updateGuide();

    if (session.useBacking) {
      void playBackingFrom(session.audioStartMs);
    } else {
      // The user plays the part in front of them; anything written as
      // accompaniment plays underneath so they hear the groove, not a bare
      // pattern.
      const accompaniment = session.events
        .map((event, index) => ({ event, index }))
        .filter((entry) => roleOf(entry.event) !== 'melody');

      if (accompaniment.length > 0) {
        schedulerRef.current?.stop();
        schedulerRef.current = startSongScheduler({
          events: accompaniment.map((entry) => entry.event),
          rate: TEMPO_RATES[tempoRef.current],
          onEvent: (event, position, atContextTime) => {
            playHit(
              event.padId,
              undefined,
              performanceFor(accompaniment[position].index, atContextTime),
            );
          },
        });
      }
    }
    startTick();
  }, [buildSession, performanceFor, playHit, startTick, updateGuide]);

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
    finishedRef.current = false;
    pointerRef.current = 0;
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: chartRef.current.length, hits: 0 });
    setPhase('demo');
    setGuidePadId(chartRef.current[0]?.padId ?? null);

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

    startTimeRef.current = getSharedAudioContext().currentTime;

    const chart = chartRef.current;
    let reached = 0;

    schedulerRef.current?.stop();
    schedulerRef.current = startSongScheduler({
      events: session.events,
      rate,
      onEvent: (event, index, atContextTime) => {
        playHit(event.padId, undefined, performanceFor(index, atContextTime));
      },
      onAdvance: (_index, event) => {
        while (reached < chart.length && chart[reached].atMs <= event.atMs) {
          reached += 1;
        }
        const current = Math.max(0, reached - 1);
        pointerRef.current = current;
        setGuidePadId(chart[current]?.padId ?? null);
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
    playHit,
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
    finishedRef.current = false;
    // Step mode has no game clock, but the practice-time award still reads
    // this timestamp — leaving it stale inflated the profile stats.
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
    setGuidePadId(null);

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
  }, [buildSession, clearTimers, ensureBackingReady, startPlaying]);

  const resetWizard = useCallback(() => {
    cancelSession();
    setSelectedSong(null);
    songRef.current = null;
    sessionRef.current = null;
    eventsRef.current = [];
    chartRef.current = [];
    velocitiesRef.current = [];
    setPlayMode(null);
    setSongScope(null);
    setResults(null);
    setGuidePadId(null);
    setDemoJustFinished(false);
    setCalibrateOffsetMs(0);
    setCalibratePreviewing(false);
    hadSavedBindingRef.current = false;
  }, [cancelSession]);

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
    const runId = ++runIdRef.current;
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
      if (runIdRef.current !== runId) {
        return;
      }

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
    // An in-flight preview must not install its note timers after this.
    runIdRef.current += 1;
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
      cancelSession();
      return;
    }
    if (phase === 'results') {
      setPhase('pickLevel');
      setResults(null);
    }
  }, [cancelSession, phase, stopCalibratePreview]);

  const backToSongList = useCallback(() => {
    cancelSession();
    setSelectedSong(null);
    songRef.current = null;
    sessionRef.current = null;
    eventsRef.current = [];
    chartRef.current = [];
    velocitiesRef.current = [];
    setPlayMode(null);
    setSongScope(null);
    setResults(null);
    setGuidePadId(null);
    setDemoJustFinished(false);
    setPhase('pickSong');
  }, [cancelSession]);

  const replay = useCallback(() => {
    setResults(null);
    setDemoJustFinished(false);
    setPhase('pickLevel');
  }, []);

  const handlePadPress = useCallback(
    (padId: DrumSoundId) => {
      if (phaseRef.current === 'demo') {
        return;
      }
      if (phaseRef.current !== 'playing') {
        playHit(padId);
        return;
      }

      const events = chartRef.current;
      if (pointerRef.current >= events.length) {
        return;
      }
      playHit(padId);

      // A stacked downbeat (crash + kick) may be hit in any order — the
      // shared judging treats onsets within a millisecond as one group.
      const judgement =
        levelRef.current === 'medium'
          ? judgeStepPress(events, pointerRef.current, padId, padIdOf)
          : judgeTimedPress(
              events,
              pointerRef.current,
              padId,
              padIdOf,
              getElapsedMs(),
              playModeRef.current === 'fullBand' ? HIT_WINDOW_BAND_MS : HIT_WINDOW_MS,
            );
      if (judgement.kind === 'hit') {
        acceptHit(judgement);
      } else if (judgement.kind === 'wrong') {
        statsRef.current.wrongPresses += 1;
      }
      // Correct pad outside the window: no penalty here — if it stays unhit,
      // the tick loop scores it as a single miss (no double punishment).
    },
    [acceptHit, getElapsedMs, playHit],
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
