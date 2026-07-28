import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { hapticSelection } from '../utils/haptics';

import { getSharedAudioContext } from '../audio/sampleBank';
import {
  getDrumMachineBank,
  type DrumMachineTypeId,
} from '../instruments/drumMachine/drumMachineBanks';
import {
  BPM_DEFAULT,
  BPM_MAX,
  BPM_MIN,
  cloneGrid,
  createEmptyGrid,
  createRandomBpm,
  createRandomGrid,
  gridStepCount,
  isBeatStep,
  normalizeGrid,
  pickRandomPatternStyle,
  resizeGrid,
  STEP_COUNT_DEFAULT,
  velocityForLevel,
  type DrumMachineGrid,
  type RandomPatternStyle,
  type StepCount,
} from '../instruments/drumMachine/drumMachineRows';
import { playMachineSound } from '../instruments/drumMachine/playMachineSound';
import { startStepClock, stepIntervalMs, type StepClockHandle } from '../instruments/drumMachine/stepClock';
import { setDrumKit } from '../instruments/drums/drumsEngine';
import type { DrumKitId } from '../instruments/drums/drumsKits';
import { scheduleCountInClickAt } from '../instruments/piano/pianoMetronome';
import type { DrumMachinePattern } from '../storage/drumMachinePatternsStorage';
import {
  DRUM_MACHINE_DEFAULT_SETTINGS,
  loadDrumMachineSettings,
  saveDrumMachineSettings,
  type SaveLoopCount,
  type SwingAmount,
} from '../storage/drumMachineSettingsStorage';

const COUNT_IN_BEATS = 4;
const TAP_TEMPO_RESET_MS = 2200;

/** One resolved song-mode slot: a pattern and how many loops it plays. */
export type SongChainEntry = {
  pattern: DrumMachinePattern;
  repeats: number;
};

type SongPlaybackState = {
  chain: SongChainEntry[];
  index: number;
  loopsLeft: number;
  /** False until the very first step-0 tick has passed. */
  started: boolean;
};

export function useDrumMachine() {
  const [machineType, setMachineTypeState] = useState<DrumMachineTypeId>('drums');
  const [settingsReady, setSettingsReady] = useState(false);
  const [grid, setGrid] = useState<DrumMachineGrid>(() =>
    createEmptyGrid(getDrumMachineBank('drums').rows.length),
  );
  const [bpm, setBpmState] = useState(BPM_DEFAULT);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [mutedRows, setMutedRows] = useState<ReadonlySet<number>>(new Set());
  const [liveRecord, setLiveRecord] = useState(false);
  const [songEntryIndex, setSongEntryIndex] = useState<number | null>(null);
  const [previewOnToggle, setPreviewOnToggleState] = useState(true);
  const [saveLoops, setSaveLoopsState] = useState<SaveLoopCount>(2);
  const [swing, setSwingState] = useState<SwingAmount>(0);
  const [stepCount, setStepCountState] = useState<StepCount>(STEP_COUNT_DEFAULT);
  const [metronomeOn, setMetronomeOnState] = useState(false);
  const [countInOn, setCountInOnState] = useState(false);
  const [hapticsOn, setHapticsOnState] = useState(true);
  const [drumKitId, setDrumKitIdState] = useState<DrumKitId>('acoustic');

  const gridRef = useRef(grid);
  const bpmRef = useRef(bpm);
  const typeRef = useRef(machineType);
  const previewRef = useRef(previewOnToggle);
  const saveLoopsRef = useRef(saveLoops);
  const swingRef = useRef<number>(swing);
  const stepCountRef = useRef<number>(stepCount);
  const metronomeRef = useRef(metronomeOn);
  const countInRef = useRef(countInOn);
  const hapticsRef = useRef(hapticsOn);
  const drumKitRef = useRef<DrumKitId>(drumKitId);
  const mutedRowsRef = useRef(mutedRows);
  const liveRecordRef = useRef(liveRecord);
  const playingRef = useRef(playing);
  const clockRef = useRef<StepClockHandle | null>(null);
  /** Timing of the most recent step — live-record quantizes against this. */
  const stepInfoRef = useRef<{ step: number; at: number } | null>(null);
  /** Pending count-in cleanup (timeouts + scheduled clicks). */
  const countInCleanupRef = useRef<(() => void) | null>(null);
  /** Active song-mode chain — null during regular single-pattern playback. */
  const songRef = useRef<SongPlaybackState | null>(null);
  const bpmSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  gridRef.current = grid;
  bpmRef.current = bpm;
  typeRef.current = machineType;
  previewRef.current = previewOnToggle;
  saveLoopsRef.current = saveLoops;
  swingRef.current = swing;
  stepCountRef.current = stepCount;
  metronomeRef.current = metronomeOn;
  countInRef.current = countInOn;
  hapticsRef.current = hapticsOn;
  drumKitRef.current = drumKitId;
  mutedRowsRef.current = mutedRows;
  liveRecordRef.current = liveRecord;
  playingRef.current = playing;

  const persistSettings = useCallback(() => {
    void saveDrumMachineSettings({
      machineType: typeRef.current,
      previewOnToggle: previewRef.current,
      saveLoops: saveLoopsRef.current,
      swing: swingRef.current as SwingAmount,
      stepCount: stepCountRef.current as StepCount,
      metronomeOn: metronomeRef.current,
      countInOn: countInRef.current,
      hapticsOn: hapticsRef.current,
      drumKitId: drumKitRef.current,
      bpm: bpmRef.current,
    });
  }, []);

  useEffect(() => {
    void loadDrumMachineSettings().then((settings) => {
      typeRef.current = settings.machineType;
      previewRef.current = settings.previewOnToggle;
      saveLoopsRef.current = settings.saveLoops;
      swingRef.current = settings.swing;
      stepCountRef.current = settings.stepCount;
      metronomeRef.current = settings.metronomeOn;
      countInRef.current = settings.countInOn;
      hapticsRef.current = settings.hapticsOn;
      drumKitRef.current = settings.drumKitId;
      bpmRef.current = settings.bpm;
      setMachineTypeState(settings.machineType);
      setPreviewOnToggleState(settings.previewOnToggle);
      setSaveLoopsState(settings.saveLoops);
      setSwingState(settings.swing);
      setStepCountState(settings.stepCount);
      setMetronomeOnState(settings.metronomeOn);
      setCountInOnState(settings.countInOn);
      setHapticsOnState(settings.hapticsOn);
      setDrumKitIdState(settings.drumKitId);
      setBpmState(settings.bpm);
      setGrid(
        createEmptyGrid(
          getDrumMachineBank(settings.machineType).rows.length,
          settings.stepCount,
        ),
      );
      setSettingsReady(true);
    });
  }, []);

  const cancelCountIn = useCallback(() => {
    countInCleanupRef.current?.();
    countInCleanupRef.current = null;
    setCountdown(null);
  }, []);

  const stop = useCallback(() => {
    cancelCountIn();
    clockRef.current?.stop();
    clockRef.current = null;
    stepInfoRef.current = null;
    songRef.current = null;
    setSongEntryIndex(null);
    setPlaying(false);
    setCurrentStep(-1);
  }, [cancelCountIn]);

  useEffect(() => {
    return () => {
      countInCleanupRef.current?.();
      clockRef.current?.stop();
      if (bpmSaveTimerRef.current) {
        // A debounced BPM write is pending — flush it instead of dropping it.
        clearTimeout(bpmSaveTimerRef.current);
        bpmSaveTimerRef.current = null;
        persistSettings();
      }
    };
  }, [persistSettings]);

  // Stop when the screen loses focus (tab switch / navigation) — the engines
  // are released on blur, so the clock must not keep ticking behind them.
  useFocusEffect(
    useCallback(() => {
      return () => {
        stop();
      };
    }, [stop]),
  );

  /** Swaps the live grid/tempo to a song-chain pattern without stopping. */
  const applySongPattern = useCallback((pattern: DrumMachinePattern) => {
    const nextGrid = normalizeGrid(cloneGrid(pattern.grid));
    // The clock's tick reads the refs synchronously — update them before the
    // state so the very next step already plays the new pattern.
    gridRef.current = nextGrid;
    setGrid(nextGrid);
    const nextStepCount = gridStepCount(nextGrid);
    stepCountRef.current = nextStepCount;
    setStepCountState(nextStepCount);
    bpmRef.current = pattern.bpm;
    setBpmState(pattern.bpm);
  }, []);

  const startClock = useCallback(() => {
    const bank = getDrumMachineBank(typeRef.current);
    clockRef.current = startStepClock(
      () => bpmRef.current,
      () => swingRef.current,
      () => stepCountRef.current,
      (step) => {
        // Song mode advances at loop boundaries: after the current entry's
        // repeats run out, the next pattern takes over seamlessly.
        if (step === 0 && songRef.current) {
          const song = songRef.current;
          if (!song.started) {
            song.started = true;
          } else {
            song.loopsLeft -= 1;
            if (song.loopsLeft <= 0) {
              song.index = (song.index + 1) % song.chain.length;
              const entry = song.chain[song.index];
              song.loopsLeft = Math.max(1, entry.repeats);
              applySongPattern(entry.pattern);
              setSongEntryIndex(song.index);
            }
          }
        }
        stepInfoRef.current = { step, at: Date.now() };
        setCurrentStep(step);
        if (metronomeRef.current && isBeatStep(stepCountRef.current, step)) {
          scheduleCountInClickAt(getSharedAudioContext().currentTime, step === 0);
        }
        const rows = gridRef.current;
        const muted = mutedRowsRef.current;
        bank.rows.forEach((row, rowIndex) => {
          if (muted.has(rowIndex)) {
            return;
          }
          const level = rows[rowIndex]?.[step] ?? 0;
          if (level > 0) {
            playMachineSound(typeRef.current, row.playKey, velocityForLevel(level));
          }
        });
      },
    );
  }, [applySongPattern]);

  const launchPlayback = useCallback(() => {
    setPlaying(true);

    if (!countInRef.current) {
      startClock();
      return;
    }

    // Count-in: click COUNT_IN_BEATS quarter notes on the audio clock, tick
    // the on-screen countdown alongside, then hand over to the step clock.
    const beatMs = stepIntervalMs(bpmRef.current) * 4;
    const context = getSharedAudioContext();
    const startAt = context.currentTime + 0.08;
    const clickCancels: (() => void)[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let beat = 0; beat < COUNT_IN_BEATS; beat += 1) {
      clickCancels.push(
        scheduleCountInClickAt(startAt + (beat * beatMs) / 1000, beat === 0),
      );
      timers.push(
        setTimeout(() => {
          setCountdown(COUNT_IN_BEATS - beat);
        }, beat * beatMs),
      );
    }
    timers.push(
      setTimeout(() => {
        countInCleanupRef.current = null;
        setCountdown(null);
        startClock();
      }, COUNT_IN_BEATS * beatMs),
    );

    countInCleanupRef.current = () => {
      for (const cancel of clickCancels) {
        cancel();
      }
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [startClock]);

  const play = useCallback(() => {
    if (clockRef.current || countInCleanupRef.current) {
      return;
    }
    launchPlayback();
  }, [launchPlayback]);

  /** Starts song mode: plays the chain in order, looping the whole song. */
  const playSongChain = useCallback(
    (chain: SongChainEntry[]) => {
      if (chain.length === 0) {
        return;
      }
      stop();
      const first = chain[0];
      applySongPattern(first.pattern);
      setMutedRows(new Set());
      songRef.current = {
        chain,
        index: 0,
        loopsLeft: Math.max(1, first.repeats),
        started: false,
      };
      setSongEntryIndex(0);
      launchPlayback();
    },
    [applySongPattern, launchPlayback, stop],
  );

  const togglePlay = useCallback(() => {
    if (playingRef.current) {
      stop();
    } else {
      play();
    }
  }, [play, stop]);

  const schedulePersistBpm = useCallback(() => {
    if (bpmSaveTimerRef.current) {
      clearTimeout(bpmSaveTimerRef.current);
    }
    bpmSaveTimerRef.current = setTimeout(() => {
      bpmSaveTimerRef.current = null;
      persistSettings();
    }, 700);
  }, [persistSettings]);

  const setBpm = useCallback(
    (next: number) => {
      // The clock reads bpmRef on every tick, so tempo changes apply live.
      const clamped = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(next)));
      setBpmState(clamped);
      bpmRef.current = clamped;
      schedulePersistBpm();
    },
    [schedulePersistBpm],
  );

  const nudgeBpm = useCallback(
    (delta: number) => {
      setBpm(bpmRef.current + delta);
    },
    [setBpm],
  );

  /** Successive taps set the tempo from the tap interval. */
  const tapTempo = useCallback(() => {
    const now = Date.now();
    const taps = tapTimesRef.current;
    if (taps.length > 0 && now - taps[taps.length - 1] > TAP_TEMPO_RESET_MS) {
      taps.length = 0;
    }
    taps.push(now);
    if (taps.length > 5) {
      taps.shift();
    }
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((at, i) => at - taps[i]);
      const avg = intervals.reduce((sum, ms) => sum + ms, 0) / intervals.length;
      setBpm(Math.round(60_000 / avg));
    }
    if (hapticsRef.current) {
      hapticSelection();
    }
  }, [setBpm]);

  const setMachineType = useCallback(
    (next: DrumMachineTypeId) => {
      if (next === typeRef.current) {
        return;
      }
      stop();
      typeRef.current = next;
      setMachineTypeState(next);
      setMutedRows(new Set());
      setGrid(
        createEmptyGrid(getDrumMachineBank(next).rows.length, stepCountRef.current),
      );
      persistSettings();
    },
    [persistSettings, stop],
  );

  const setPreviewOnToggle = useCallback(
    (next: boolean) => {
      setPreviewOnToggleState(next);
      previewRef.current = next;
      persistSettings();
    },
    [persistSettings],
  );

  const setSaveLoops = useCallback(
    (next: SaveLoopCount) => {
      setSaveLoopsState(next);
      saveLoopsRef.current = next;
      persistSettings();
    },
    [persistSettings],
  );

  const setSwing = useCallback(
    (next: SwingAmount) => {
      setSwingState(next);
      swingRef.current = next;
      persistSettings();
    },
    [persistSettings],
  );

  const setStepCount = useCallback(
    (next: StepCount) => {
      if (next === stepCountRef.current) {
        return;
      }
      stepCountRef.current = next;
      setStepCountState(next);
      // Keep what fits — shrinking trims the tail, growing appends silence.
      setGrid((prev) => resizeGrid(prev, next));
      persistSettings();
    },
    [persistSettings],
  );

  const setMetronomeOn = useCallback(
    (next: boolean) => {
      setMetronomeOnState(next);
      metronomeRef.current = next;
      persistSettings();
    },
    [persistSettings],
  );

  const setCountInOn = useCallback(
    (next: boolean) => {
      setCountInOnState(next);
      countInRef.current = next;
      persistSettings();
    },
    [persistSettings],
  );

  const setHapticsOn = useCallback(
    (next: boolean) => {
      setHapticsOnState(next);
      hapticsRef.current = next;
      persistSettings();
    },
    [persistSettings],
  );

  const setDrumKit_ = useCallback(
    (next: DrumKitId) => {
      setDrumKitIdState(next);
      drumKitRef.current = next;
      // Applies instantly when the drums engine is live; otherwise the next
      // engine init picks it up.
      if (typeRef.current === 'drums') {
        setDrumKit(next);
      }
      persistSettings();
    },
    [persistSettings],
  );

  /** Restores every machine setting to factory defaults (bank stays put). */
  const resetSettings = useCallback(() => {
    const d = DRUM_MACHINE_DEFAULT_SETTINGS;
    previewRef.current = d.previewOnToggle;
    setPreviewOnToggleState(d.previewOnToggle);
    saveLoopsRef.current = d.saveLoops;
    setSaveLoopsState(d.saveLoops);
    swingRef.current = d.swing;
    setSwingState(d.swing);
    metronomeRef.current = d.metronomeOn;
    setMetronomeOnState(d.metronomeOn);
    countInRef.current = d.countInOn;
    setCountInOnState(d.countInOn);
    hapticsRef.current = d.hapticsOn;
    setHapticsOnState(d.hapticsOn);
    drumKitRef.current = d.drumKitId;
    setDrumKitIdState(d.drumKitId);
    if (typeRef.current === 'drums') {
      setDrumKit(d.drumKitId);
    }
    if (stepCountRef.current !== d.stepCount) {
      stepCountRef.current = d.stepCount;
      setStepCountState(d.stepCount);
      setGrid((prev) => resizeGrid(prev, d.stepCount));
    }
    bpmRef.current = d.bpm;
    setBpmState(d.bpm);
    persistSettings();
  }, [persistSettings]);

  /** Cell taps cycle off → normal → accent → off. */
  const toggleCell = useCallback((rowIndex: number, stepIndex: number) => {
    const level = gridRef.current[rowIndex]?.[stepIndex];
    if (level === undefined) {
      return;
    }
    const nextLevel = level >= 2 ? 0 : level + 1;
    if (hapticsRef.current) {
      hapticSelection();
    }
    // Preview outside the state updater — updaters must stay pure (StrictMode
    // runs them twice, which would double-trigger the sound).
    if (nextLevel > 0 && previewRef.current) {
      const row = getDrumMachineBank(typeRef.current).rows[rowIndex];
      if (row) {
        playMachineSound(typeRef.current, row.playKey, velocityForLevel(nextLevel));
      }
    }
    setGrid((prev) => {
      const rowCells = prev[rowIndex];
      if (rowCells?.[stepIndex] === undefined) {
        return prev;
      }
      // Only clone the touched row — untouched rows keep their reference so
      // memoized grid rows skip re-rendering.
      const next = [...prev];
      next[rowIndex] = [...rowCells];
      next[rowIndex][stepIndex] = nextLevel;
      return next;
    });
  }, []);

  /**
   * Row-head tap: preview the sound; in live-record mode while playing it
   * also writes the hit into the nearest step.
   */
  const previewRow = useCallback((rowIndex: number) => {
    const row = getDrumMachineBank(typeRef.current).rows[rowIndex];
    if (!row) {
      return;
    }
    playMachineSound(typeRef.current, row.playKey);

    if (!liveRecordRef.current || !playingRef.current) {
      return;
    }
    const info = stepInfoRef.current;
    if (!info) {
      return;
    }
    const interval = stepIntervalMs(bpmRef.current);
    const elapsed = Date.now() - info.at;
    const target =
      elapsed > interval / 2
        ? (info.step + 1) % stepCountRef.current
        : info.step;
    setGrid((prev) => {
      const rowCells = prev[rowIndex];
      if (rowCells?.[target] === undefined || rowCells[target] > 0) {
        return prev;
      }
      const next = [...prev];
      next[rowIndex] = [...rowCells];
      next[rowIndex][target] = 1;
      return next;
    });
  }, []);

  const toggleMuteRow = useCallback((rowIndex: number) => {
    if (hapticsRef.current) {
      hapticSelection();
    }
    setMutedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  }, []);

  const toggleLiveRecord = useCallback(() => {
    setLiveRecord((prev) => !prev);
  }, []);

  const clearGrid = useCallback(() => {
    setMutedRows(new Set());
    setGrid(
      createEmptyGrid(
        getDrumMachineBank(typeRef.current).rows.length,
        stepCountRef.current,
      ),
    );
  }, []);

  const randomizeGrid = useCallback(
    (options?: { style?: RandomPatternStyle; includeBpm?: boolean }) => {
      const style = options?.style ?? pickRandomPatternStyle();
      const rowCount = getDrumMachineBank(typeRef.current).rows.length;
      setGrid(createRandomGrid(rowCount, style, stepCountRef.current));
      if (options?.includeBpm) {
        const nextBpm = createRandomBpm();
        setBpmState(nextBpm);
        bpmRef.current = nextBpm;
      }
    },
    [],
  );

  const loadPattern = useCallback(
    (pattern: DrumMachinePattern) => {
      stop();
      const type = pattern.machineType ?? 'drums';
      const nextGrid = normalizeGrid(cloneGrid(pattern.grid));
      typeRef.current = type;
      setMachineTypeState(type);
      setMutedRows(new Set());
      setGrid(nextGrid);
      const nextStepCount = gridStepCount(nextGrid);
      stepCountRef.current = nextStepCount;
      setStepCountState(nextStepCount);
      setBpmState(pattern.bpm);
      bpmRef.current = pattern.bpm;
      persistSettings();
    },
    [persistSettings, stop],
  );

  const bank = getDrumMachineBank(machineType);

  return {
    settingsReady,
    machineType,
    setMachineType,
    bank,
    grid,
    bpm,
    playing,
    currentStep,
    countdown,
    stepCount,
    setStepCount,
    togglePlay,
    stop,
    setBpm,
    nudgeBpm,
    tapTempo,
    toggleCell,
    previewRow,
    clearGrid,
    randomizeGrid,
    loadPattern,
    mutedRows,
    toggleMuteRow,
    liveRecord,
    toggleLiveRecord,
    previewOnToggle,
    setPreviewOnToggle,
    saveLoops,
    setSaveLoops,
    swing,
    setSwing,
    metronomeOn,
    setMetronomeOn,
    countInOn,
    setCountInOn,
    hapticsOn,
    setHapticsOn,
    drumKitId,
    setDrumKitId: setDrumKit_,
    resetSettings,
    playSongChain,
    songEntryIndex,
  };
}
