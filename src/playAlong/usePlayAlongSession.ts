import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getSharedAudioContext, prepareSamplePlayback } from '../audio/sampleBank';
import { startSongScheduler, type SongSchedulerHandle } from '../audio/songScheduler';
import {
  applyHit,
  countOverdue,
  HIT_WINDOW_BAND_MS,
  HIT_WINDOW_MS,
  judgeStepPress,
  judgeTimedPress,
  sessionElapsedMs,
  summarizeResults,
  type PlayAlongResults,
} from '../instruments/shared/playAlongScoring';
import {
  melodyEvents,
  resolveDurations,
  resolveVelocities,
  roleOf,
  type NotePerformance,
  type PerformedEvent,
} from '../instruments/shared/songPerformance';
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
  type SongBackingTrack,
  type SongDefinition,
  type SongMeter,
} from '../instruments/piano/songs/types';
import { awardPlayAlongCompletion } from '../profile/awardPlayAlong';
import {
  copySongAudioFile,
  copySongPianoLessFile,
  getSongAudioBinding,
  mergeSongWithAudioBinding,
  saveSongAudioBinding,
} from '../storage/songAudioBindingsStorage';
import type { InstrumentId } from '../types/recording';

// One play-along session for every instrument. The five hooks were 83–99.7%
// identical copies, and fixes had already drifted between them; each now
// describes its instrument with an adapter and maps this hook's result onto
// the names its screen has always used.

export type SupportLevel = 'guided' | 'medium' | 'free';
export type PlayTempo = 'slow' | 'normal' | 'fast';
export type PlayAlongScope = 'partial' | 'full';

export const TEMPO_RATES: Record<PlayTempo, number> = {
  slow: 0.75,
  normal: 1,
  fast: 1.25,
};

export type PlayAlongPhase =
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

export type { PlayAlongResults };

export type PlayAlongProgress = {
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

function clampOffset(ms: number): number {
  return Math.max(OFFSET_MIN_MS, Math.min(OFFSET_MAX_MS, Math.round(ms)));
}

/** What every instrument's chart song has in common. */
export type PlayAlongSong<TEvent> = {
  id: string;
  title: string;
  events: TEvent[];
  meter?: SongMeter;
  backingTrack?: SongBackingTrack;
};

/** What every instrument's session resolver returns. */
export type PlayAlongSessionPlan<TEvent> = {
  events: TEvent[];
  useBacking: boolean;
  /** Seek / start position on the backing track. */
  audioStartMs: number;
  /** Stop the backing track here; absent or null plays to its end. */
  audioEndMs?: number | null;
};

export type PlayAlongAdapter<
  TEvent extends PerformedEvent,
  TSong extends PlayAlongSong<TEvent>,
  TSolo extends string,
> = {
  instrument: InstrumentId;
  /** The mode that plays the instrument alone ('piano', 'guitar', …). */
  soloMode: TSolo;
  catalog: TSong[];
  findCatalogSong: (songId: string) => TSong | undefined;
  resolveSession: (
    song: TSong,
    mode: TSolo | 'fullBand',
    scope: PlayAlongScope,
  ) => PlayAlongSessionPlan<TEvent>;
  /** The id a press of this event's key/pad/string sends. */
  idOf: (event: TEvent) => string;
  /**
   * Written lengths are performed. Off for drums: a struck drum rings for as
   * long as the kit says.
   */
  sustains: boolean;
  /** Semitones an event sounds away from its key (piano accompaniment). */
  transposeOf?: (event: TEvent) => number | undefined;
  /**
   * The right note just outside its window counts as a wrong press. Drums
   * leave it alone: if it stays unhit, the tick scores one miss, not two.
   */
  penalizeMistimed: boolean;

  // The rest are product differences between the screens, kept as they were.

  /** `isActive` covers the whole wizard, not just countdown/demo/playing. */
  activeDuringWizard: boolean;
  /** Replay restarts the same level at once instead of reopening the level picker. */
  replayRestarts: boolean;
  /** Band Mode skips the level picker and is always free play over the mix. */
  bandSkipsLevelPick: boolean;
  /**
   * Keyboard-style presses: every press sounds — during the demo and past the
   * last note too — resuming a suspended audio context first. Otherwise a
   * press during the demo is ignored and one past the last note is silent.
   */
  pressAlwaysSounds: boolean;
  onOpen?: () => void;
  onFinish?: () => void;
};

export type PlayAlongPlayer = (id: string, performance?: NotePerformance) => void;

export function usePlayAlongSession<
  TEvent extends PerformedEvent,
  TSong extends PlayAlongSong<TEvent>,
  TSolo extends string,
>(
  adapter: PlayAlongAdapter<TEvent, TSong, TSolo>,
  play: PlayAlongPlayer,
  extraSongs: TSong[],
  onUserSongOffsetSaved?: (songId: string, eventsStartMs: number) => void,
) {
  type Mode = TSolo | 'fullBand';

  const [phase, setPhase] = useState<PlayAlongPhase>('idle');
  const [selectedSong, setSelectedSong] = useState<TSong | null>(null);
  const [playMode, setPlayMode] = useState<Mode | null>(null);
  const [songScope, setSongScope] = useState<PlayAlongScope | null>(null);
  const [level, setLevel] = useState<SupportLevel>('guided');
  const [tempo, setTempoState] = useState<PlayTempo>('normal');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [progress, setProgress] = useState<PlayAlongProgress>({
    resolved: 0,
    total: 0,
    hits: 0,
  });
  const [results, setResults] = useState<PlayAlongResults | null>(null);
  /** True after a guided demo ends, until the user picks a play level. */
  const [demoJustFinished, setDemoJustFinished] = useState(false);
  const [calibrateOffsetMs, setCalibrateOffsetMs] = useState(0);
  const [calibratePreviewing, setCalibratePreviewing] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);

  // "Latest value" refs: the audio callbacks read current settings without
  // being re-created on every tick.
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  const playRef = useRef(play);
  playRef.current = play;
  const extraSongsRef = useRef(extraSongs);
  extraSongsRef.current = extraSongs;
  const onOffsetSavedRef = useRef(onUserSongOffsetSaved);
  onOffsetSavedRef.current = onUserSongOffsetSaved;

  const songRef = useRef<TSong | null>(null);
  const sessionRef = useRef<PlayAlongSessionPlan<TEvent> | null>(null);
  /** Everything that sounds, accompaniment included. */
  const eventsRef = useRef<TEvent[]>([]);
  /**
   * Only what the user is asked to play — drives the guide and the score. The
   * session's own copy: scoring may reorder notes that share an onset.
   */
  const chartRef = useRef<TEvent[]>([]);
  /** Ring time and strike strength per entry of `eventsRef`. */
  const durationsRef = useRef<number[]>([]);
  const velocitiesRef = useRef<number[]>([]);
  const schedulerRef = useRef<SongSchedulerHandle | null>(null);
  const playModeRef = useRef<Mode | null>(null);
  const songScopeRef = useRef<PlayAlongScope | null>(null);
  const levelRef = useRef<SupportLevel>('guided');
  const tempoRef = useRef<PlayTempo>('normal');
  const phaseRef = useRef<PlayAlongPhase>('idle');
  /** Audio-clock time (s) the current session started. */
  const startTimeRef = useRef(0);
  const pointerRef = useRef(0);
  const statsRef = useRef({ hits: 0, misses: 0, wrongPresses: 0 });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Set once a session has been scored; cleared by every start. */
  const finishedRef = useRef(false);
  /**
   * Bumped by every start attempt and every cancel. The starters await before
   * installing their timers, so without this a second tap (double-tapped
   * level or Replay) interleaves with the first and both sets of timers
   * survive — and a Stop during loading would be undone when the load ends.
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

  /**
   * Stop whatever is running or about to run. The starters await audio
   * loading before they install timers or start the backing track; bumping
   * the run id makes any of them still in flight bail out, instead of
   * starting a session nobody is in.
   */
  const cancelSession = useCallback(() => {
    runIdRef.current += 1;
    clearTimers();
    void stopBackingTrack();
  }, [clearTimers]);

  useEffect(() => {
    const runId = runIdRef;
    return () => {
      // Leaving the screen mid-load must not start the session afterwards.
      runId.current += 1;
      clearTimers();
      void stopBackingTrack();
    };
  }, [clearTimers]);

  const applySong = useCallback((song: TSong) => {
    setSelectedSong(song);
    songRef.current = song;
  }, []);

  /** Position on the chart's timeline (song time, ms). */
  const getElapsedMs = useCallback(() => {
    const session = sessionRef.current;
    if (session?.useBacking) {
      // The backing player's playbackRate keeps its clock in song time.
      return getBackingElapsedMs(session.audioStartMs);
    }
    // The audio clock is the one the notes are actually placed on. Wall time
    // drifts against it under render load, which is exactly when the hit
    // windows must not move.
    const elapsed = (getSharedAudioContext().currentTime - startTimeRef.current) * 1000;
    return elapsed * TEMPO_RATES[tempoRef.current];
  }, []);

  const updateGuide = useCallback(() => {
    const events = chartRef.current;
    if (events.length === 0 || pointerRef.current >= events.length) {
      setGuideId(null);
      return;
    }
    if (levelRef.current === 'free' && playModeRef.current !== 'fullBand') {
      setGuideId(null);
      return;
    }
    const current = events[pointerRef.current];
    setGuideId(current ? adapterRef.current.idOf(current) : null);
  }, []);

  const finishSong = useCallback(() => {
    // The backing track ending and the tick loop can both get here; a session
    // is scored and awarded once.
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    clearTimers();
    void stopBackingTrack();
    setGuideId(null);

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

    const summary = summarizeResults(statsRef.current, events.length);
    setResults(summary);

    // Real time spent in the session, off the audio clock it was started on —
    // not tempo-scaled song time, and not the (now stopped) backing track.
    void awardPlayAlongCompletion({
      instrument: adapterRef.current.instrument,
      songId: songRef.current?.id ?? null,
      stars: summary.stars,
      elapsedMs: sessionElapsedMs(startTimeRef.current, getSharedAudioContext().currentTime),
    });
    adapterRef.current.onFinish?.();

    const timer = setTimeout(() => {
      setPhase('results');
    }, RESULTS_DELAY_MS);
    timersRef.current.push(timer);
  }, [clearTimers]);

  /** Guide, progress and the end-of-chart check, after the pointer moved. */
  const pointerMoved = useCallback(() => {
    updateGuide();

    const events = chartRef.current;
    setProgress({
      resolved: pointerRef.current,
      total: events.length,
      hits: statsRef.current.hits,
    });

    if (pointerRef.current < events.length) {
      return;
    }
    setGuideId(null);
    // With backing audio, let the track play out; the tick loop or the
    // finished-callback ends the session.
    if (!sessionRef.current?.useBacking) {
      finishSong();
    }
  }, [finishSong, updateGuide]);

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

  const buildSession = useCallback((): PlayAlongSessionPlan<TEvent> | null => {
    const song = songRef.current;
    const mode = playModeRef.current;
    const scope = songScopeRef.current;
    if (!song || !mode || !scope) {
      return null;
    }
    const current = adapterRef.current;
    const session = current.resolveSession(song, mode, scope);
    sessionRef.current = session;
    eventsRef.current = session.events;
    // Accompaniment sounds but is never highlighted or scored — the user is
    // still only asked to play their part. A fresh, sorted array: judging
    // relies on onset order and may swap notes that share an onset, and the
    // catalog's own arrays must never be mutated.
    chartRef.current = melodyEvents(session.events).sort((a, b) => a.atMs - b.atMs);
    durationsRef.current = current.sustains
      ? resolveDurations(session.events, {
          isSameNote: (a, b) => current.idOf(a) === current.idOf(b),
        })
      : [];
    velocitiesRef.current = resolveVelocities(session.events, song.meter);
    return session;
  }, []);

  /** Length and strength written for the event at `index` of `eventsRef`. */
  const performanceFor = useCallback((index: number, atTime?: number): NotePerformance => {
    const durationMs = durationsRef.current[index];
    const event = eventsRef.current[index];
    const transpose = event ? adapterRef.current.transposeOf?.(event) : undefined;
    return {
      atTime,
      ...(durationMs ? { sustainSeconds: durationMs / 1000 } : {}),
      velocity: velocitiesRef.current[index],
      ...(transpose !== undefined ? { transposeSemitones: transpose } : {}),
    };
  }, []);

  const finishDemo = useCallback(() => {
    clearTimers();
    void stopBackingTrack();
    setGuideId(null);
    setDemoJustFinished(true);
    setPhase('pickLevel');
  }, [clearTimers]);

  const ensureBackingReady = useCallback(
    async (session: PlayAlongSessionPlan<TEvent>) => {
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

      const missWindow = playModeRef.current === 'fullBand' ? HIT_WINDOW_BAND_MS : HIT_WINDOW_MS;
      const overdue = countOverdue(events, pointerRef.current, getElapsedMs(), missWindow);
      if (overdue > 0) {
        statsRef.current.misses += overdue;
        pointerRef.current += overdue;
        pointerMoved();
      }
    }, TICK_MS);
  }, [finishSong, getElapsedMs, pointerMoved]);

  /** Reset the score for a new run. */
  const resetScore = useCallback(() => {
    finishedRef.current = false;
    pointerRef.current = 0;
    statsRef.current = { hits: 0, misses: 0, wrongPresses: 0 };
    setProgress({ resolved: 0, total: chartRef.current.length, hits: 0 });
  }, []);

  const startPlaying = useCallback(() => {
    const session = sessionRef.current ?? buildSession();
    if (!session) {
      return;
    }

    startTimeRef.current = getSharedAudioContext().currentTime;
    resetScore();
    setPhase('playing');
    updateGuide();

    if (session.useBacking) {
      void playBackingFrom(session.audioStartMs);
    } else {
      // The user plays their part; anything written as accompaniment plays
      // underneath so they hear the song rather than a bare line.
      const accompaniment = session.events
        .map((event, index) => ({ event, index }))
        .filter((entry) => roleOf(entry.event) !== 'melody');

      if (accompaniment.length > 0) {
        schedulerRef.current?.stop();
        schedulerRef.current = startSongScheduler({
          events: accompaniment.map((entry) => entry.event),
          rate: TEMPO_RATES[tempoRef.current],
          onEvent: (event, position, atContextTime) => {
            playRef.current(
              adapterRef.current.idOf(event),
              performanceFor(accompaniment[position].index, atContextTime),
            );
          },
        });
      }
    }
    startTick();
  }, [buildSession, performanceFor, resetScore, startTick, updateGuide]);

  const startDemo = useCallback(async () => {
    const runId = ++runIdRef.current;
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    setDemoJustFinished(false);
    resetScore();
    setPhase('demo');
    const first = chartRef.current[0];
    setGuideId(first ? adapterRef.current.idOf(first) : null);

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
        const current = events[Math.max(0, idx - 1)];
        setGuideId(current ? adapterRef.current.idOf(current) : null);
        setProgress({
          resolved: Math.min(events.length, idx),
          total: events.length,
          hits: 0,
        });

        if (session.audioEndMs != null && getBackingCurrentTimeMs() >= session.audioEndMs) {
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
        playRef.current(adapterRef.current.idOf(event), performanceFor(index, atContextTime));
      },
      onAdvance: (_index, event) => {
        while (reached < chart.length && chart[reached].atMs <= event.atMs) {
          reached += 1;
        }
        const current = chart[Math.max(0, reached - 1)];
        setGuideId(current ? adapterRef.current.idOf(current) : null);
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
    resetScore,
  ]);

  const startStepMode = useCallback(async () => {
    const runId = ++runIdRef.current;
    const session = buildSession();
    if (!session) {
      return;
    }

    clearTimers();
    setResults(null);
    // Step mode has no game clock, but the practice award still reads this.
    startTimeRef.current = getSharedAudioContext().currentTime;
    resetScore();
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
  }, [buildSession, clearTimers, ensureBackingReady, resetScore, startTick, updateGuide]);

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
    setGuideId(null);

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

  const startForLevel = useCallback(
    (target: SupportLevel) => {
      if (target === 'guided') {
        void startDemo();
      } else if (target === 'medium') {
        void startStepMode();
      } else {
        void startCountdown();
      }
    },
    [startCountdown, startDemo, startStepMode],
  );

  /** Forget the song, session and results — the wizard starts over. */
  const resetWizard = useCallback(() => {
    cancelSession();
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
    setGuideId(null);
    setDemoJustFinished(false);
  }, [cancelSession]);

  const open = useCallback(() => {
    resetWizard();
    setCalibrateOffsetMs(0);
    setCalibratePreviewing(false);
    hadSavedBindingRef.current = false;
    setPhase('pickSong');
    adapterRef.current.onOpen?.();
  }, [resetWizard]);

  const close = useCallback(() => {
    resetWizard();
    setCalibrateOffsetMs(0);
    setCalibratePreviewing(false);
    hadSavedBindingRef.current = false;
    setPhase('idle');
  }, [resetWizard]);

  const selectSong = useCallback(
    async (songId: string) => {
      const base =
        adapterRef.current.findCatalogSong(songId) ??
        extraSongsRef.current.find((entry) => entry.id === songId);
      if (!base) {
        return;
      }

      // Bindings are stored in the piano song shape; every instrument's song
      // carries the same id/backingTrack fields the merge touches.
      const merged = (await mergeSongWithAudioBinding(
        base as unknown as SongDefinition,
      )) as unknown as TSong;
      applySong(merged);
      hadSavedBindingRef.current = songHasBackingAudio(merged.backingTrack);
      const solo = adapterRef.current.soloMode;
      setPlayMode(solo);
      playModeRef.current = solo;
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

  /** Band play without a level pick — always free play over the mix. */
  const startBandPlay = useCallback(() => {
    setLevel('free');
    levelRef.current = 'free';
    void startCountdown();
  }, [startCountdown]);

  /** Where the wizard goes once Band Mode has a calibrated track. */
  const afterBandReady = useCallback(() => {
    if (adapterRef.current.bandSkipsLevelPick) {
      startBandPlay();
    } else {
      setPhase('pickLevel');
    }
  }, [startBandPlay]);

  const selectScope = useCallback((scope: PlayAlongScope) => {
    setSongScope(scope);
    songScopeRef.current = scope;
    setDemoJustFinished(false);
    setPhase('pickLevel');
  }, []);

  const selectPlayMode = useCallback(
    (mode: Mode) => {
      setPlayMode(mode);
      playModeRef.current = mode;

      if (mode !== 'fullBand') {
        setPhase('pickLevel');
        return;
      }
      if (!songHasBackingAudio(songRef.current?.backingTrack)) {
        setPhase('pickAudio');
        return;
      }
      if (hadSavedBindingRef.current) {
        afterBandReady();
        return;
      }
      enterCalibrate();
    },
    [afterBandReady, enterCalibrate],
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

        applySong({
          ...song,
          backingTrack: {
            ...(song.backingTrack?.module != null ? { module: song.backingTrack.module } : {}),
            uri: localUri,
            eventsStartMs,
          },
        });
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
   * Pick a stem with this instrument removed (karaoke / "piano-less"). Saved
   * alongside the full-mix binding so the backing player prefers it.
   */
  const pickStemBacking = useCallback(
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
        const stemUri = copySongPianoLessFile(song.id, sourceUri, fileNameHint);

        // Preserve an existing full-mix binding if any.
        const existingBinding = await getSongAudioBinding(song.id);
        const localUri = existingBinding?.localUri ?? song.backingTrack?.uri ?? '';
        const eventsStartMs =
          song.backingTrack?.eventsStartMs ?? existingBinding?.eventsStartMs ?? 0;

        await saveSongAudioBinding({
          songId: song.id,
          localUri,
          eventsStartMs,
          pianoLessLocalUri: stemUri,
        });

        applySong({
          ...song,
          backingTrack: {
            ...(song.backingTrack ?? { eventsStartMs: 0 }),
            ...(localUri ? { uri: localUri } : {}),
            pianoLessUri: stemUri,
            eventsStartMs,
          },
        });
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
    if (!song || !songHasBackingAudio(song.backingTrack)) {
      return;
    }

    clearTimers();
    const runId = ++runIdRef.current;
    setCalibratePreviewing(true);
    const offset = clampOffset(calibrateOffsetMs);

    try {
      await prepareSamplePlayback();
      await prepareBackingTrack({ ...song.backingTrack!, eventsStartMs: offset });
      await playBackingFrom(Math.max(0, offset));
      if (runIdRef.current !== runId) {
        return;
      }

      // Light the first few chart notes against the wall clock for a rough feel.
      for (const event of song.events.slice(0, 8)) {
        const timer = setTimeout(() => {
          if (phaseRef.current !== 'calibrateOffset') {
            return;
          }
          const id = adapterRef.current.idOf(event);
          playRef.current(id);
          setGuideId(id);
        }, event.atMs);
        timersRef.current.push(timer);
      }

      const endTimer = setTimeout(() => {
        void stopBackingTrack();
        setGuideId(null);
        setCalibratePreviewing(false);
      }, CALIBRATE_PREVIEW_MS);
      timersRef.current.push(endTimer);
    } catch {
      setCalibratePreviewing(false);
      void stopBackingTrack();
    }
  }, [calibrateOffsetMs, clearTimers]);

  const stopCalibratePreview = useCallback(() => {
    // An in-flight preview must not install its note timers after this.
    runIdRef.current += 1;
    clearTimers();
    void stopBackingTrack();
    setGuideId(null);
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

    applySong({
      ...song,
      backingTrack: {
        ...song.backingTrack!,
        eventsStartMs,
      },
    });
    hadSavedBindingRef.current = true;
    onOffsetSavedRef.current?.(song.id, eventsStartMs);
    afterBandReady();
  }, [afterBandReady, applySong, calibrateOffsetMs, stopCalibratePreview]);

  const openRecalibrate = useCallback(() => {
    enterCalibrate();
  }, [enterCalibrate]);

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

  const goBack = useCallback(() => {
    if (phase === 'pickScope') {
      setPhase('pickSong');
      setSelectedSong(null);
      songRef.current = null;
      setSongScope(null);
      return;
    }
    if (phase === 'pickMode') {
      const solo = adapterRef.current.soloMode;
      setPlayMode(solo);
      playModeRef.current = solo;
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
      cancelSession();
      setResults(null);
      setDemoJustFinished(false);
      setPhase('pickLevel');
    }
  }, [cancelSession, phase, stopCalibratePreview]);

  const backToSongList = useCallback(() => {
    resetWizard();
    setPhase('pickSong');
  }, [resetWizard]);

  const replay = useCallback(() => {
    if (adapterRef.current.replayRestarts) {
      if (songRef.current) {
        startForLevel(levelRef.current);
      }
      return;
    }
    setResults(null);
    setDemoJustFinished(false);
    setPhase('pickLevel');
  }, [startForLevel]);

  const handlePress = useCallback(
    (id: string, options?: { skipPlayback?: boolean }) => {
      const current = adapterRef.current;
      const sound = () => {
        if (!options?.skipPlayback) {
          playRef.current(id);
        }
      };
      const events = chartRef.current;
      const chartDone = pointerRef.current >= events.length;

      if (current.pressAlwaysSounds) {
        const ctx = getSharedAudioContext();
        if (ctx.state === 'suspended') {
          void ctx.resume().then(sound);
        } else {
          sound();
        }
        // Past the last note (a band track playing out) nothing is scored —
        // noodling along to the outro is not a wrong press.
        if (phaseRef.current !== 'playing' || chartDone) {
          return;
        }
      } else {
        if (phaseRef.current === 'demo') {
          return;
        }
        if (phaseRef.current !== 'playing') {
          sound();
          return;
        }
        if (chartDone) {
          return;
        }
        sound();
      }

      const judgement =
        levelRef.current === 'medium'
          ? judgeStepPress(events, pointerRef.current, id, current.idOf)
          : judgeTimedPress(
              events,
              pointerRef.current,
              id,
              current.idOf,
              getElapsedMs(),
              playModeRef.current === 'fullBand' ? HIT_WINDOW_BAND_MS : HIT_WINDOW_MS,
            );
      if (judgement.kind === 'hit') {
        acceptHit(judgement);
      } else if (judgement.kind === 'wrong' || current.penalizeMistimed) {
        statsRef.current.wrongPresses += 1;
      }
    },
    [acceptHit, getElapsedMs],
  );

  const isActive = adapter.activeDuringWizard
    ? phase !== 'idle'
    : phase === 'countdown' || phase === 'demo' || phase === 'playing';

  const isListeningOutro =
    playMode === 'fullBand' &&
    phase === 'playing' &&
    progress.total > 0 &&
    progress.resolved >= progress.total;

  const hasBackingAudio = songHasBackingAudio(selectedSong?.backingTrack);
  const hasStemBacking = hasPianoLessTrack(selectedSong?.backingTrack);

  // A new array every render would hand the screen a new identity each time,
  // invalidating every callback that depends on the song list.
  const catalog = adapter.catalog;
  const songs = useMemo(() => [...catalog, ...extraSongs], [catalog, extraSongs]);

  return {
    songs,
    phase,
    selectedSong,
    playMode,
    songScope,
    level,
    tempo,
    countdownValue,
    guideId,
    progress,
    results,
    demoJustFinished,
    isActive,
    isListeningOutro,
    hasBackingAudio,
    hasStemBacking,
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
    handlePress,
    pickBackingAudio,
    pickStemBacking,
    setCalibrateOffset,
    previewCalibrate,
    stopCalibratePreview,
    confirmCalibrate,
    openRecalibrate,
  };
}
