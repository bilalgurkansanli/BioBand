import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { getSharedAudioContext, prepareSamplePlayback } from '../audio/sampleBank';
import type { PadBankId } from '../instruments/pads/padsBanks';
import { triggerPadForBank } from '../instruments/pads/padsEngine';
import type { PadSoundId } from '../instruments/pads/padsSounds';
import {
  getMetronomeBpm,
  METRONOME_BPM_DEFAULT,
  scheduleCountInClickAt,
} from '../instruments/piano/pianoMetronome';
import type { PadQuantizeMode } from '../storage/padsSettingsStorage';
import { createStudioProject, addTrackFromTake } from '../storage/studioProjectsStorage';
import type { SavedRecording } from '../types/recording';

export type LooperPhase = 'idle' | 'countIn' | 'running';
export type LooperBars = 1 | 2 | 4;

export type LooperEvent = {
  padId: PadSoundId;
  atMs: number;
  velocity: number;
  /**
   * Audio-clock time before which the scheduler must NOT replay this event.
   * A freshly captured hit already sounded live; without this, forward
   * quantize can re-schedule it 60-125 ms later in the same cycle (flam).
   */
  notBeforeSec?: number;
};

export type LooperLayer = {
  id: string;
  bankId: PadBankId;
  events: LooperEvent[];
  muted: boolean;
};

const BEATS_PER_BAR = 4;
const COUNT_IN_BEATS = 4;
/** 1/16-note grid for quantize. */
const GRID_PER_BAR = 16;
const SCHEDULER_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.09;
const MAX_EVENTS_PER_LAYER = 512;
const MAX_LAYERS = 8;
/** Studio export writes this many passes of the loop. */
const EXPORT_REPEATS = 4;

let layerSerial = 0;

function nextLayerId(): string {
  return `loop-layer-${Date.now()}-${layerSerial++}`;
}

function quantizeMs(
  atMs: number,
  loopDurMs: number,
  bars: number,
  mode: PadQuantizeMode,
): number {
  // The final % guards the rounding edge: a position a hair under the loop
  // end must wrap to 0, never land AT loopDurMs (which would export as a
  // stray extra downbeat past the track's duration).
  if (mode === 'off') {
    return Math.round(((atMs % loopDurMs) + loopDurMs) % loopDurMs) % loopDurMs;
  }
  const grid = loopDurMs / (bars * GRID_PER_BAR);
  const nearest = Math.round(atMs / grid) * grid;
  const snapped = mode === 'full' ? nearest : atMs + (nearest - atMs) * 0.5;
  return Math.round(((snapped % loopDurMs) + loopDurMs) % loopDurMs) % loopDurMs;
}

/**
 * Live pad looper: a 1/2/4-bar ring at the metronome BPM. Hits captured while
 * armed snap to the 1/16 grid and repeat; layers stack, each remembering the
 * bank it was played on. Once layers hold events, the loop's BPM and bar
 * count are locked (until cleared) so existing events never play against a
 * different timebase.
 *
 * Timing: the loop is anchored to the audio clock. A coarse JS timer wakes
 * every 25 ms and schedules the hits inside the next 90 ms window with
 * per-hit setTimeout remainders — jitter stays a few ms and never accumulates
 * (the drums step-sequencer's chained-setTimeout drift bug is what this
 * design avoids).
 */
export function usePadsLooper(options: {
  getBankId: () => PadBankId;
  getQuantize: () => PadQuantizeMode;
  onScheduledHit?: (padId: PadSoundId) => void;
}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [phase, setPhase] = useState<LooperPhase>('idle');
  const [bars, setBarsState] = useState<LooperBars>(2);
  const [bpm, setBpm] = useState(METRONOME_BPM_DEFAULT);
  const [recArmed, setRecArmed] = useState(true);
  const [layers, setLayers] = useState<LooperLayer[]>([]);
  const [countInBeat, setCountInBeat] = useState(0);
  /** Increments on every loop wrap — restarts the progress animation. */
  const [cycleStamp, setCycleStamp] = useState(0);

  const phaseRef = useRef<LooperPhase>('idle');
  phaseRef.current = phase;
  const recArmedRef = useRef(recArmed);
  recArmedRef.current = recArmed;
  const barsRef = useRef<LooperBars>(bars);
  barsRef.current = bars;
  // Layers source of truth. State mirrors it for UI — mutations go through
  // mutateLayers so same-tick captures (two-finger chords) see each other
  // instead of the render-lagged state snapshot.
  const layersRef = useRef<LooperLayer[]>([]);

  const loopStartRef = useRef(0);
  const loopDurSecRef = useRef(0);
  const scheduledUntilRef = useRef(0);
  const lastCycleRef = useRef(-1);
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const countInCancelsRef = useRef<(() => void)[]>([]);
  const activeLayerIdRef = useRef<string | null>(null);
  /** Synchronous re-entry guard for start() (phaseRef lags a render). */
  const startingRef = useRef(false);
  /** Loop timebase is locked while layers hold events. */
  const lockedBpmRef = useRef<number | null>(null);
  const lockedBarsRef = useRef<LooperBars | null>(null);

  const mutateLayers = useCallback(
    (mutate: (layers: LooperLayer[]) => LooperLayer[]) => {
      const next = mutate(layersRef.current);
      layersRef.current = next;
      setLayers(next);
    },
    [],
  );

  const clearPendingTimers = useCallback(() => {
    for (const timer of pendingTimersRef.current) {
      clearTimeout(timer);
    }
    pendingTimersRef.current.clear();
  }, []);

  const cancelCountInClicks = useCallback(() => {
    for (const cancel of countInCancelsRef.current) {
      cancel();
    }
    countInCancelsRef.current = [];
  }, []);

  const stopScheduler = useCallback(() => {
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    clearPendingTimers();
    cancelCountInClicks();
  }, [cancelCountInClicks, clearPendingTimers]);

  const gridSeconds = useCallback((): number => {
    const dur = loopDurSecRef.current;
    const lockedBars = lockedBarsRef.current ?? barsRef.current;
    return dur > 0 ? dur / (lockedBars * GRID_PER_BAR) : 0;
  }, []);

  const scheduleHit = useCallback((layer: LooperLayer, event: LooperEvent, delayMs: number) => {
    const timer = setTimeout(() => {
      pendingTimersRef.current.delete(timer);
      // 'idle' means stopped; count-in phase may linger one frame past the
      // musical loop start (phaseRef lags the render), so don't drop then.
      if (phaseRef.current === 'idle') {
        return;
      }
      triggerPadForBank(layer.bankId, event.padId, event.velocity);
      optionsRef.current.onScheduledHit?.(event.padId);
    }, Math.max(0, delayMs));
    pendingTimersRef.current.add(timer);
  }, []);

  const runScheduler = useCallback(() => {
    const context = getSharedAudioContext();
    const now = context.currentTime;
    const dur = loopDurSecRef.current;
    if (dur <= 0) {
      return;
    }

    const ahead = now + SCHEDULE_AHEAD_SECONDS;
    const from = Math.max(scheduledUntilRef.current, loopStartRef.current);
    if (ahead <= from) {
      return;
    }

    if (now >= loopStartRef.current) {
      const cycle = Math.floor((now - loopStartRef.current) / dur);
      if (cycle !== lastCycleRef.current) {
        lastCycleRef.current = cycle;
        // Monotonic increment — never the absolute cycle index. Mixing the
        // two let equal values collide and React skipped the render, so the
        // playhead animation froze for a whole pass.
        setCycleStamp((previous) => previous + 1);
      }
    }

    const firstCycle = Math.floor((from - loopStartRef.current) / dur);
    const lastCycle = Math.floor((ahead - loopStartRef.current) / dur);

    for (const layer of layersRef.current) {
      if (layer.muted) {
        continue;
      }
      for (const event of layer.events) {
        for (let cycle = firstCycle; cycle <= lastCycle; cycle++) {
          const at = loopStartRef.current + cycle * dur + event.atMs / 1000;
          // Half-open [from, ahead): windows tile with no gap AND the very
          // first window's `from === loopStart` still admits the atMs=0
          // downbeat (a closed lower bound skipped it — every restarted
          // loop played its first pass without beat one).
          if (at < from || at >= ahead) {
            continue;
          }
          // The live hit already sounded — skip its own just-captured slot.
          if (event.notBeforeSec !== undefined && at < event.notBeforeSec) {
            continue;
          }
          scheduleHit(layer, event, (at - now) * 1000);
        }
      }
    }

    scheduledUntilRef.current = ahead;
  }, [scheduleHit]);

  const stop = useCallback(() => {
    stopScheduler();
    startingRef.current = false;
    setPhase('idle');
    setCountInBeat(0);
    lastCycleRef.current = -1;
  }, [stopScheduler]);

  // Unmount AND blur: the engine is released on blur, so a still-armed
  // scheduler would churn timers/renders silently and blast back on refocus.
  useEffect(() => stop, [stop]);
  useFocusEffect(useCallback(() => stop, [stop]));

  const ensureActiveLayer = useCallback((): string => {
    const currentBank = optionsRef.current.getBankId();
    const active = layersRef.current.find(
      (layer) => layer.id === activeLayerIdRef.current,
    );

    if (active) {
      if (active.bankId === currentBank) {
        return active.id;
      }
      // Bank switched mid-loop: an empty layer just adopts the new bank; a
      // layer with takes is closed so its hits keep their original sounds.
      if (active.events.length === 0) {
        mutateLayers((previous) =>
          previous.map((layer) =>
            layer.id === active.id ? { ...layer, bankId: currentBank } : layer,
          ),
        );
        return active.id;
      }
    }

    if (layersRef.current.length >= MAX_LAYERS) {
      // At the cap: keep recording into the newest layer instead of leaking
      // past the limit.
      const last = layersRef.current[layersRef.current.length - 1];
      activeLayerIdRef.current = last.id;
      return last.id;
    }

    const layer: LooperLayer = {
      id: nextLayerId(),
      bankId: currentBank,
      events: [],
      muted: false,
    };
    activeLayerIdRef.current = layer.id;
    mutateLayers((previous) => [...previous, layer]);
    return layer.id;
  }, [mutateLayers]);

  const start = useCallback(async () => {
    if (phaseRef.current !== 'idle' || startingRef.current) {
      return;
    }
    startingRef.current = true;

    try {
      await prepareSamplePlayback();
    } catch {
      startingRef.current = false;
      return;
    }
    if (!startingRef.current) {
      // stop() raced the await — abort silently.
      return;
    }
    const context = getSharedAudioContext();

    // Existing takes lock the timebase — replaying them against a new BPM or
    // bar count would shift every hit (and export events past durationMs).
    const hasEvents = layersRef.current.some((layer) => layer.events.length > 0);
    const activeBpm = hasEvents
      ? lockedBpmRef.current ?? METRONOME_BPM_DEFAULT
      : getMetronomeBpm() || METRONOME_BPM_DEFAULT;
    const activeBars = hasEvents ? lockedBarsRef.current ?? barsRef.current : barsRef.current;
    lockedBpmRef.current = activeBpm;
    lockedBarsRef.current = activeBars;
    if (activeBars !== barsRef.current) {
      setBarsState(activeBars);
    }
    setBpm(activeBpm);

    const beatSec = 60 / activeBpm;
    const dur = activeBars * BEATS_PER_BAR * beatSec;
    loopDurSecRef.current = dur;

    const countInStart = context.currentTime + 0.1;
    const loopStart = countInStart + COUNT_IN_BEATS * beatSec;
    loopStartRef.current = loopStart;
    scheduledUntilRef.current = loopStart;
    lastCycleRef.current = -1;

    ensureActiveLayer();
    setPhase('countIn');
    phaseRef.current = 'countIn';
    setCountInBeat(COUNT_IN_BEATS);

    for (let beat = 0; beat < COUNT_IN_BEATS; beat++) {
      countInCancelsRef.current.push(
        scheduleCountInClickAt(countInStart + beat * beatSec, beat === 0),
      );
      const timer = setTimeout(
        () => {
          pendingTimersRef.current.delete(timer);
          if (phaseRef.current === 'countIn') {
            setCountInBeat(COUNT_IN_BEATS - beat - 1);
          }
        },
        Math.max(0, (countInStart + (beat + 1) * beatSec - context.currentTime) * 1000),
      );
      pendingTimersRef.current.add(timer);
    }

    const startTimer = setTimeout(
      () => {
        pendingTimersRef.current.delete(startTimer);
        if (phaseRef.current === 'countIn') {
          setPhase('running');
          phaseRef.current = 'running';
          setCountInBeat(0);
          // cycleStamp is advanced solely by the scheduler's cycle detection
          // — a second writer here raced it into a frozen playhead.
        }
      },
      Math.max(0, (loopStart - context.currentTime) * 1000),
    );
    pendingTimersRef.current.add(startTimer);

    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
    }
    schedulerRef.current = setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
    startingRef.current = false;
  }, [ensureActiveLayer, runScheduler]);

  /**
   * Capture a live hit into the armed layer. Returns true when captured.
   * The caller still plays the hit immediately — capture is additive.
   * Hits landing up to one grid step before the loop starts (players
   * anticipating beat one during count-in) snap to the downbeat.
   */
  const captureHit = useCallback((padId: PadSoundId, velocity: number): boolean => {
    if (phaseRef.current === 'idle' || !recArmedRef.current) {
      return false;
    }
    const dur = loopDurSecRef.current;
    if (dur <= 0) {
      return false;
    }

    const context = getSharedAudioContext();
    const posSec = context.currentTime - loopStartRef.current;
    const grid = gridSeconds();

    let atMs: number;
    let notBeforeSec: number;
    if (posSec < 0) {
      // Still in count-in: only the last grid-step counts as an early "one".
      if (posSec < -grid) {
        return false;
      }
      atMs = 0;
      // Pin past the loop start: the early live hit stands in for the
      // cycle-0 downbeat, and the replay begins on cycle 1. Anchoring to
      // `now` instead left a window where cycle 0 replayed 112-150 ms after
      // the live hit (flam).
      notBeforeSec = loopStartRef.current + grid * 0.5;
    } else {
      const rawMs = ((posSec * 1000) % (dur * 1000) + dur * 1000) % (dur * 1000);
      atMs = quantizeMs(
        rawMs,
        dur * 1000,
        lockedBarsRef.current ?? barsRef.current,
        optionsRef.current.getQuantize(),
      );
      // Suppress the scheduler's replay of this hit inside the current
      // grid window — the player already heard it live.
      notBeforeSec = context.currentTime + grid * 0.75;
    }

    const layerId = ensureActiveLayer();
    const activeLayer = layersRef.current.find((layer) => layer.id === layerId);
    // At the layer cap a bank switch cannot open a new layer — refuse the
    // capture rather than silently recording bank-B hits into a bank-A layer
    // (replay and export would use the wrong sounds).
    if (!activeLayer || activeLayer.bankId !== optionsRef.current.getBankId()) {
      return false;
    }

    const event: LooperEvent = {
      padId,
      atMs,
      velocity,
      notBeforeSec,
    };
    mutateLayers((previous) =>
      previous.map((layer) => {
        if (layer.id !== layerId || layer.events.length >= MAX_EVENTS_PER_LAYER) {
          return layer;
        }
        return { ...layer, events: [...layer.events, event] };
      }),
    );
    return true;
  }, [ensureActiveLayer, gridSeconds, mutateLayers]);

  const commitLayer = useCallback(() => {
    if (layersRef.current.length >= MAX_LAYERS) {
      return;
    }
    const layer: LooperLayer = {
      id: nextLayerId(),
      bankId: optionsRef.current.getBankId(),
      events: [],
      muted: false,
    };
    activeLayerIdRef.current = layer.id;
    mutateLayers((previous) => [...previous, layer]);
  }, [mutateLayers]);

  const toggleLayerMuted = useCallback((layerId: string) => {
    mutateLayers((previous) =>
      previous.map((layer) =>
        layer.id === layerId ? { ...layer, muted: !layer.muted } : layer,
      ),
    );
  }, [mutateLayers]);

  // Note: neither remove nor clear touches the locked timebase. Unlocking
  // mid-run made the NEXT start fall back to the default BPM and replay any
  // freshly captured hits against the wrong grid — start() already ignores
  // the lock whenever no events remain, so it never needs explicit clearing.
  const removeLayer = useCallback((layerId: string) => {
    if (activeLayerIdRef.current === layerId) {
      activeLayerIdRef.current = null;
    }
    mutateLayers((previous) => previous.filter((layer) => layer.id !== layerId));
  }, [mutateLayers]);

  const clearLayers = useCallback(() => {
    activeLayerIdRef.current = null;
    mutateLayers(() => []);
  }, [mutateLayers]);

  const setBars = useCallback((next: LooperBars) => {
    // The bar count is part of the recorded timebase — only changeable while
    // idle with no takes.
    if (phaseRef.current !== 'idle') {
      return;
    }
    if (layersRef.current.some((layer) => layer.events.length > 0)) {
      return;
    }
    setBarsState(next);
    lockedBarsRef.current = null;
  }, []);

  const toggleRecArm = useCallback(() => {
    setRecArmed((previous) => !previous);
  }, []);

  /**
   * Write the loop into a fresh Studio project — one track per layer, each
   * with its own bank, repeated a few passes so the beat has body.
   */
  const exportToStudio = useCallback(async (title: string): Promise<string | null> => {
    const source = layersRef.current.filter(
      (layer) => !layer.muted && layer.events.length > 0,
    );
    if (source.length === 0) {
      return null;
    }

    const loopDurMs = Math.round(loopDurSecRef.current * 1000);
    if (loopDurMs <= 0) {
      return null;
    }

    const project = await createStudioProject(title);
    const durationMs = loopDurMs * EXPORT_REPEATS;

    for (let index = 0; index < source.length; index++) {
      const layer = source[index];
      const events = [];
      for (let repeat = 0; repeat < EXPORT_REPEATS; repeat++) {
        for (const event of layer.events) {
          // quantizeMs guarantees atMs < loopDurMs; skip (never clamp) any
          // out-of-range stragglers — clamping stacked them onto the pass
          // boundary as phase-aligned double-triggers.
          if (event.atMs >= loopDurMs) {
            continue;
          }
          events.push({
            soundId: event.padId,
            atMs: repeat * loopDurMs + event.atMs,
            velocity: event.velocity,
          });
        }
      }
      events.sort((a, b) => a.atMs - b.atMs);

      const take: SavedRecording = {
        id: `${Date.now()}-${index}`,
        createdAt: Date.now(),
        instrument: 'pads',
        mode: 'instrument',
        durationMs,
        events,
        padBankId: layer.bankId,
      };
      await addTrackFromTake(project.id, take);
    }

    return project.id;
  }, []);

  const activeEventCount = layers.reduce((sum, layer) => sum + layer.events.length, 0);
  const barsLocked = layers.some((layer) => layer.events.length > 0);

  return {
    phase,
    bars,
    bpm,
    recArmed,
    layers,
    countInBeat,
    cycleStamp,
    loopDurationMs: Math.round(loopDurSecRef.current * 1000),
    activeEventCount,
    barsLocked,
    isRunning: phase === 'running',
    start,
    stop,
    captureHit,
    commitLayer,
    toggleLayerMuted,
    removeLayer,
    clearLayers,
    setBars,
    toggleRecArm,
    exportToStudio,
  };
}
