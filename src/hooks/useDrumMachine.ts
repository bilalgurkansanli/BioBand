import { useCallback, useEffect, useRef, useState } from 'react';

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
  pickRandomPatternStyle,
  type DrumMachineGrid,
  type RandomPatternStyle,
} from '../instruments/drumMachine/drumMachineRows';
import { playMachineSound } from '../instruments/drumMachine/playMachineSound';
import { startStepClock, type StepClockHandle } from '../instruments/drumMachine/stepClock';
import type { DrumMachinePattern } from '../storage/drumMachinePatternsStorage';
import {
  loadDrumMachineSettings,
  saveDrumMachineSettings,
} from '../storage/drumMachineSettingsStorage';

export function useDrumMachine() {
  const [machineType, setMachineTypeState] = useState<DrumMachineTypeId>('drums');
  const [settingsReady, setSettingsReady] = useState(false);
  const [grid, setGrid] = useState<DrumMachineGrid>(() =>
    createEmptyGrid(getDrumMachineBank('drums').rows.length),
  );
  const [bpm, setBpmState] = useState(BPM_DEFAULT);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const gridRef = useRef(grid);
  const bpmRef = useRef(bpm);
  const typeRef = useRef(machineType);
  const clockRef = useRef<StepClockHandle | null>(null);

  gridRef.current = grid;
  bpmRef.current = bpm;
  typeRef.current = machineType;

  useEffect(() => {
    void loadDrumMachineSettings().then((settings) => {
      setMachineTypeState(settings.machineType);
      setGrid(createEmptyGrid(getDrumMachineBank(settings.machineType).rows.length));
      setSettingsReady(true);
    });
  }, []);

  const stop = useCallback(() => {
    clockRef.current?.stop();
    clockRef.current = null;
    setPlaying(false);
    setCurrentStep(-1);
  }, []);

  useEffect(() => {
    return () => {
      clockRef.current?.stop();
    };
  }, []);

  const play = useCallback(() => {
    if (clockRef.current) {
      return;
    }
    setPlaying(true);
    const bank = getDrumMachineBank(typeRef.current);
    clockRef.current = startStepClock(bpmRef.current, (step) => {
      setCurrentStep(step);
      const rows = gridRef.current;
      bank.rows.forEach((row, rowIndex) => {
        if (rows[rowIndex]?.[step]) {
          playMachineSound(typeRef.current, row.playKey);
        }
      });
    });
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) {
      stop();
    } else {
      play();
    }
  }, [play, playing, stop]);

  const setBpm = useCallback(
    (next: number) => {
      const clamped = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(next)));
      setBpmState(clamped);
      bpmRef.current = clamped;
      if (playing) {
        stop();
      }
    },
    [playing, stop],
  );

  const nudgeBpm = useCallback(
    (delta: number) => {
      setBpm(bpmRef.current + delta);
    },
    [setBpm],
  );

  const setMachineType = useCallback(
    (next: DrumMachineTypeId) => {
      if (next === typeRef.current) {
        return;
      }
      stop();
      typeRef.current = next;
      setMachineTypeState(next);
      setGrid(createEmptyGrid(getDrumMachineBank(next).rows.length));
      void saveDrumMachineSettings({ machineType: next });
    },
    [stop],
  );

  const toggleCell = useCallback((rowIndex: number, stepIndex: number) => {
    setGrid((prev) => {
      const next = cloneGrid(prev);
      const cell = next[rowIndex]?.[stepIndex];
      if (cell === undefined) {
        return prev;
      }
      next[rowIndex][stepIndex] = !cell;
      if (!cell) {
        const row = getDrumMachineBank(typeRef.current).rows[rowIndex];
        if (row) {
          playMachineSound(typeRef.current, row.playKey);
        }
      }
      return next;
    });
  }, []);

  const previewRow = useCallback((playKey: string) => {
    playMachineSound(typeRef.current, playKey);
  }, []);

  const clearGrid = useCallback(() => {
    setGrid(createEmptyGrid(getDrumMachineBank(typeRef.current).rows.length));
  }, []);

  const randomizeGrid = useCallback(
    (options?: { style?: RandomPatternStyle; includeBpm?: boolean }) => {
      const style = options?.style ?? pickRandomPatternStyle();
      const rowCount = getDrumMachineBank(typeRef.current).rows.length;
      setGrid(createRandomGrid(rowCount, style));
      if (options?.includeBpm) {
        const nextBpm = createRandomBpm();
        setBpmState(nextBpm);
        bpmRef.current = nextBpm;
        if (playing) {
          stop();
        }
      }
    },
    [playing, stop],
  );

  const loadPattern = useCallback(
    (pattern: DrumMachinePattern) => {
      stop();
      const type = pattern.machineType ?? 'drums';
      typeRef.current = type;
      setMachineTypeState(type);
      setGrid(cloneGrid(pattern.grid));
      setBpmState(pattern.bpm);
      bpmRef.current = pattern.bpm;
      void saveDrumMachineSettings({ machineType: type });
    },
    [stop],
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
    togglePlay,
    stop,
    setBpm,
    nudgeBpm,
    toggleCell,
    previewRow,
    clearGrid,
    randomizeGrid,
    loadPattern,
  };
}
