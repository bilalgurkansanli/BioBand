import type { AudioNode, GainNode } from '../../audio/audioApi';
import { getMasterInput, getSharedAudioContext } from '../../audio/sampleBank';

// Piano FX bus. Voices always feed a stable `voiceBus`.
//
//   voiceBus ─→ dry ──────────────────┐
//   voiceBus ─→ drive → shaper → tone ┴→ post ─→ master
//
// Reverb does NOT use ConvolverNode. On react-native-audio-api, convolution
// (and any dry+wet branch from one node — #1000) causes crackle / underruns.
// Reverb is scheduled as short, quieter multi-tap re-triggers — same pattern
// as echo, denser and earlier for a room-like wash.
//
// Echo does NOT use DelayNode — DelayNode is broken on Android.

export type PianoFxSettings = {
  distortion: { enabled: boolean; lowPassHz: number; intensity: number };
  reverb: { enabled: boolean; timeSeconds: number; mix: number };
  echo: { enabled: boolean; delayMs: number; feedback: number; mix: number };
};

export type PianoEchoPlayback = {
  enabled: boolean;
  delayMs: number;
  /** First repeat level relative to the dry note (0..~0.55). */
  firstRepeatGain: number;
  /** Multiplier applied to each subsequent repeat. */
  feedback: number;
};

export const PIANO_FX_DEFAULTS: PianoFxSettings = {
  distortion: { enabled: false, lowPassHz: 8000, intensity: 0.3 },
  reverb: { enabled: false, timeSeconds: 1.2, mix: 0.55 },
  // Classic: dry first, then quieter delayed repeats (~380ms).
  echo: { enabled: false, delayMs: 380, feedback: 0.35, mix: 0.4 },
};

export const PIANO_FX_RANGES = {
  lowPassHz: { min: 500, max: 10000 },
  intensity: { min: 0, max: 1 },
  timeSeconds: { min: 0.3, max: 3 },
  mix: { min: 0, max: 1.0 },
  delayMs: { min: 120, max: 900 },
  feedback: { min: 0, max: 1 },
  echoMix: { min: 0, max: 1 },
} as const;

/** Cap so the delayed repeat stays quieter than the dry piano. */
const ECHO_FIRST_REPEAT_MAX = 0.5;
const ECHO_FEEDBACK_MAX = 0.75;
const ECHO_MAX_REPEATS = 5;

/**
 * Multi-tap reverb: audible early reflections + decaying wash.
 * Delays scale with timeSeconds; levels scale with mix. No ConvolverNode.
 */
const REVERB_TAP_DELAY_RATIOS = [0.08, 0.14, 0.22, 0.32, 0.45, 0.62] as const;
const REVERB_TAP_LEVELS = [0.42, 0.32, 0.24, 0.18, 0.13, 0.09] as const;
const REVERB_FIRST_TAP_MAX = 0.38;

const GAIN_RAMP_SECONDS = 0.02;

function cloneSettings(settings: PianoFxSettings): PianoFxSettings {
  return {
    distortion: { ...settings.distortion },
    reverb: { ...settings.reverb },
    echo: { ...settings.echo },
  };
}

let currentSettings: PianoFxSettings = cloneSettings(PIANO_FX_DEFAULTS);

type AudioContextT = ReturnType<typeof getSharedAudioContext>;
type BiquadFilterNode = ReturnType<AudioContextT['createBiquadFilter']>;

type FxGraph = {
  voiceBus: GainNode;
  dry: GainNode;
  post: GainNode;
  distDrive: GainNode | null;
  distFilter: BiquadFilterNode | null;
  distWet: GainNode | null;
  bypassed: boolean;
};

let graph: FxGraph | null = null;
let distortionFailed = false;

const DISTORTION_TEARDOWN_MS = 220;
let distortionTeardownTimer: ReturnType<typeof setTimeout> | null = null;

/** Pending echo / reverb re-triggers — cleared when FX off or engine releases. */
const echoTimers = new Set<ReturnType<typeof setTimeout>>();
const reverbTimers = new Set<ReturnType<typeof setTimeout>>();

function disconnectSafe(node: { disconnect: () => void } | null | undefined): void {
  if (!node) {
    return;
  }
  try {
    node.disconnect();
  } catch {
    // Already disconnected.
  }
}

function setGainImmediate(node: GainNode, value: number): void {
  try {
    const now = getSharedAudioContext().currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(value, now);
  } catch {
    node.gain.value = value;
  }
}

function rampGain(node: GainNode, value: number, now: number): void {
  try {
    node.gain.cancelScheduledValues(now);
    const current =
      typeof node.gain.value === 'number' && Number.isFinite(node.gain.value)
        ? node.gain.value
        : value;
    node.gain.setValueAtTime(current, now);
    node.gain.linearRampToValueAtTime(value, now + GAIN_RAMP_SECONDS);
  } catch {
    node.gain.value = value;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildDistortionCurve(): Float32Array {
  const resolution = 2048;
  const curve = new Float32Array(resolution);
  for (let i = 0; i < resolution; i++) {
    const x = (i / (resolution - 1)) * 2 - 1;
    curve[i] = Math.tanh(2.5 * x);
  }
  return curve;
}

function disconnectFrom(
  source: { disconnect: (dest?: AudioNode) => void } | null | undefined,
  dest: AudioNode | null | undefined,
): void {
  if (!source || !dest) {
    return;
  }
  try {
    source.disconnect(dest);
  } catch {
    // Not connected.
  }
}

function connectCorePath(g: FxGraph): void {
  const master = getMasterInput();

  disconnectFrom(g.voiceBus, g.dry);
  disconnectFrom(g.voiceBus, master);
  disconnectFrom(g.dry, g.post);
  disconnectFrom(g.post, master);

  if (g.bypassed) {
    g.voiceBus.connect(master);
    return;
  }

  g.voiceBus.connect(g.dry);
  g.dry.connect(g.post);
  g.post.connect(master);
}

function ensureGraph(): FxGraph {
  if (graph) {
    return graph;
  }

  const context = getSharedAudioContext();
  const voiceBus = context.createGain();
  const dry = context.createGain();
  const post = context.createGain();
  dry.gain.value = 1;
  post.gain.value = 1;
  voiceBus.gain.value = 1;

  graph = {
    voiceBus,
    dry,
    post,
    distDrive: null,
    distFilter: null,
    distWet: null,
    bypassed: false,
  };

  connectCorePath(graph);
  return graph;
}

function cancelDistortionTeardown(): void {
  if (distortionTeardownTimer) {
    clearTimeout(distortionTeardownTimer);
    distortionTeardownTimer = null;
  }
}

function tearDownDistortionStage(g: FxGraph): void {
  cancelDistortionTeardown();
  disconnectFrom(g.voiceBus, g.distDrive);
  disconnectSafe(g.distDrive);
  disconnectSafe(g.distFilter);
  disconnectSafe(g.distWet);
  g.distDrive = null;
  g.distFilter = null;
  g.distWet = null;
}

function scheduleDistortionTeardown(g: FxGraph): void {
  if (!g.distDrive && !g.distWet) {
    return;
  }
  cancelDistortionTeardown();
  distortionTeardownTimer = setTimeout(() => {
    distortionTeardownTimer = null;
    if (graph && !currentSettings.distortion.enabled) {
      tearDownDistortionStage(graph);
    }
  }, DISTORTION_TEARDOWN_MS);
}

function tearDownWetStages(g: FxGraph): void {
  tearDownDistortionStage(g);
}

/** Cancel pending delayed echo repeats (echo off / leave piano). */
export function clearPianoEchoTimers(): void {
  for (const timer of echoTimers) {
    clearTimeout(timer);
  }
  echoTimers.clear();
}

/** Cancel pending reverb taps (reverb off / leave piano). */
export function clearPianoReverbTimers(): void {
  for (const timer of reverbTimers) {
    clearTimeout(timer);
  }
  reverbTimers.clear();
}

/**
 * Playback params for scheduled echo repeats. When disabled, engine skips
 * scheduling. firstRepeatGain is always below 1 so dry stays primary.
 */
export function getPianoEchoPlayback(): PianoEchoPlayback {
  const { echo } = currentSettings;
  const mix = clamp(echo.mix, 0, 1);
  const feedback = clamp(echo.feedback, 0, 1);
  return {
    enabled: echo.enabled,
    delayMs: clamp(echo.delayMs, PIANO_FX_RANGES.delayMs.min, PIANO_FX_RANGES.delayMs.max),
    firstRepeatGain: mix * ECHO_FIRST_REPEAT_MAX,
    feedback: feedback * ECHO_FEEDBACK_MAX,
  };
}

/**
 * Schedule quieter re-triggers after the dry note. `playRepeat(gainScale)`
 * should play the same note at `dryGain * gainScale` with a unique voice tag
 * so it does not steal the dry note.
 */
export function schedulePianoEchoRepeats(
  playRepeat: (gainScale: number) => void,
): void {
  const echo = getPianoEchoPlayback();
  if (!echo.enabled || echo.firstRepeatGain < 0.02) {
    return;
  }

  let level = echo.firstRepeatGain;
  let delay = echo.delayMs;

  for (let i = 0; i < ECHO_MAX_REPEATS && level >= 0.025; i++) {
    const thisLevel = level;
    const timer = setTimeout(() => {
      echoTimers.delete(timer);
      // Drop if user turned echo off before this repeat fires.
      if (!currentSettings.echo.enabled) {
        return;
      }
      playRepeat(thisLevel);
    }, delay);
    echoTimers.add(timer);
    delay += echo.delayMs;
    level *= Math.max(0.12, echo.feedback);
  }
}

/**
 * Schedule dense early-reflection taps for a room-like wash without
 * ConvolverNode. `playTap(gainScale, tapIndex)` must use a unique tag and
 * preferably a short voice tail to protect polyphony.
 */
export function schedulePianoReverbTaps(
  playTap: (gainScale: number, tapIndex: number) => void,
): void {
  const { reverb } = currentSettings;
  if (!reverb.enabled) {
    return;
  }

  const mix = clamp(reverb.mix, 0, 1);
  if (mix < 0.02) {
    return;
  }

  const timeSeconds = clamp(
    reverb.timeSeconds,
    PIANO_FX_RANGES.timeSeconds.min,
    PIANO_FX_RANGES.timeSeconds.max,
  );

  for (let i = 0; i < REVERB_TAP_DELAY_RATIOS.length; i++) {
    // Minimum spacing so taps never collapse into the dry attack.
    const delayMs = Math.max(
      35 + i * 28,
      Math.round(REVERB_TAP_DELAY_RATIOS[i] * timeSeconds * 1000),
    );
    const level = Math.min(REVERB_FIRST_TAP_MAX, REVERB_TAP_LEVELS[i] * mix);
    if (level < 0.025) {
      continue;
    }

    const tapIndex = i;
    const thisLevel = level;
    const timer = setTimeout(() => {
      reverbTimers.delete(timer);
      if (!currentSettings.reverb.enabled) {
        return;
      }
      playTap(thisLevel, tapIndex);
    }, delayMs);
    reverbTimers.add(timer);
  }
}

export function resetPianoFx(): void {
  clearPianoEchoTimers();
  clearPianoReverbTimers();

  if (graph) {
    tearDownWetStages(graph);
    setGainImmediate(graph.dry, 1);
    setGainImmediate(graph.post, 1);
    graph.bypassed = false;
    connectCorePath(graph);
  }

  distortionFailed = false;
  currentSettings = cloneSettings(PIANO_FX_DEFAULTS);
}

function ensureDistortionStage(g: FxGraph): void {
  if (g.distWet || distortionFailed || g.bypassed) {
    return;
  }

  try {
    const context = getSharedAudioContext();
    const drive = context.createGain();
    const shaper = context.createWaveShaper();
    shaper.curve = buildDistortionCurve();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = currentSettings.distortion.lowPassHz;
    const wet = context.createGain();
    wet.gain.value = 0;

    g.voiceBus.connect(drive);
    drive.connect(shaper);
    shaper.connect(filter);
    filter.connect(wet);
    wet.connect(g.post);

    g.distDrive = drive;
    g.distFilter = filter;
    g.distWet = wet;
  } catch (error) {
    distortionFailed = true;
    console.warn('Piano FX: distortion unavailable', error);
  }
}

function applyToGraph(g: FxGraph, settings: PianoFxSettings): void {
  if (g.bypassed) {
    return;
  }

  const now = getSharedAudioContext().currentTime;
  const { distortion } = settings;

  rampGain(g.dry, 1, now);
  rampGain(g.post, 1, now);

  if (distortion.enabled) {
    cancelDistortionTeardown();
    ensureDistortionStage(g);
  }

  if (distortion.enabled && g.distWet && g.distDrive) {
    const drive = 1 + distortion.intensity * 4;
    rampGain(g.distDrive, drive, now);
    rampGain(g.distWet, 0.55 / Math.sqrt(drive), now);
  } else if (g.distWet) {
    rampGain(g.distWet, 0, now);
  }
  if (g.distFilter) {
    g.distFilter.frequency.value = distortion.lowPassHz;
  }

  // WaveShaper left attached mutes the graph on this library — tear down.
  if (!distortion.enabled || distortionFailed) {
    scheduleDistortionTeardown(g);
  }
}

export function getPianoFxInput(): GainNode {
  return ensureGraph().voiceBus;
}

export function applyPianoFxSettings(settings: PianoFxSettings): void {
  const wasEchoOn = currentSettings.echo.enabled;
  const wasReverbOn = currentSettings.reverb.enabled;
  currentSettings = cloneSettings(settings);

  if (wasEchoOn && !currentSettings.echo.enabled) {
    clearPianoEchoTimers();
  }
  if (wasReverbOn && !currentSettings.reverb.enabled) {
    clearPianoReverbTimers();
  }

  try {
    const g = ensureGraph();

    if (g.bypassed) {
      g.bypassed = false;
      connectCorePath(g);
    }

    applyToGraph(g, currentSettings);
  } catch (error) {
    console.warn('Piano FX: applying settings failed, bypassing wet FX', error);
    if (graph) {
      tearDownWetStages(graph);
      graph.bypassed = true;
      setGainImmediate(graph.dry, 1);
      setGainImmediate(graph.post, 1);
      connectCorePath(graph);
    }
  }
}

export function getPianoFxSettings(): PianoFxSettings {
  return cloneSettings(currentSettings);
}

export function isAnyPianoFxEnabled(settings: PianoFxSettings): boolean {
  return (
    settings.distortion.enabled || settings.reverb.enabled || settings.echo.enabled
  );
}
