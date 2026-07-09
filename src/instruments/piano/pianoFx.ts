import type { AudioNode, GainNode } from '../../audio/audioApi';
import { getMasterInput, getSharedAudioContext } from '../../audio/sampleBank';

// Piano FX bus. Voices always feed a stable `voiceBus`.
//
//   voiceBus ─→ dry ──────────────────┐
//   voiceBus ─→ drive → shaper → tone ┴→ post ─→ master
//                                      post ─→ convolver → wet → master  (+reverb)
//
// Echo does NOT use DelayNode — react-native-audio-api's DelayNode is broken
// on Android (no real delay, dry path corruption). Echo is scheduled as
// quieter note re-triggers in pianoEngine via getPianoEchoPlayback().

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
  reverb: { enabled: false, timeSeconds: 1.2, mix: 0.35 },
  // Classic: dry first, then quieter delayed repeats (~380ms).
  echo: { enabled: false, delayMs: 380, feedback: 0.35, mix: 0.4 },
};

export const PIANO_FX_RANGES = {
  lowPassHz: { min: 500, max: 10000 },
  intensity: { min: 0, max: 1 },
  timeSeconds: { min: 0.3, max: 3 },
  mix: { min: 0, max: 0.6 },
  delayMs: { min: 120, max: 900 },
  feedback: { min: 0, max: 1 },
  echoMix: { min: 0, max: 1 },
} as const;

/** Cap so the delayed repeat stays quieter than the dry piano. */
const ECHO_FIRST_REPEAT_MAX = 0.5;
const ECHO_FEEDBACK_MAX = 0.75;
const ECHO_MAX_REPEATS = 5;

const GAIN_RAMP_SECONDS = 0.02;
const POST_TRIM_WET = 0.7;

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
type ConvolverNode = ReturnType<AudioContextT['createConvolver']>;

type FxGraph = {
  voiceBus: GainNode;
  dry: GainNode;
  post: GainNode;
  distDrive: GainNode | null;
  distFilter: BiquadFilterNode | null;
  distWet: GainNode | null;
  convolver: ConvolverNode | null;
  reverbWet: GainNode | null;
  bypassed: boolean;
};

let graph: FxGraph | null = null;
let distortionFailed = false;
let reverbFailed = false;
let impulseSeconds = 0;

// Delay between fading the reverb tail to silence and physically removing the
// convolver from the graph. Long enough for the wet fade to finish so the tail
// does not cut with a click.
const REVERB_TEARDOWN_MS = 220;
let reverbTeardownTimer: ReturnType<typeof setTimeout> | null = null;

/** Pending echo re-triggers — cleared when echo is turned off or engine releases. */
const echoTimers = new Set<ReturnType<typeof setTimeout>>();

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

function buildImpulseBuffer(seconds: number) {
  const context = getSharedAudioContext();
  const rate = context.sampleRate;
  const length = Math.max(Math.floor(rate * 0.1), Math.floor(rate * seconds));
  const impulse = context.createBuffer(2, length, rate);

  // A raw white-noise tail convolves into a harsh, metallic "sssh". Two things
  // tame it into a natural room: a one-pole lowpass smooths the noise into a
  // warmer diffuse tail, and a short fade-in removes the click from a hard
  // onset at t=0. Decay is a smooth exponential so it dies away, not cuts off.
  const attack = Math.max(1, Math.floor(rate * 0.006));

  for (let channel = 0; channel < 2; channel++) {
    const data = new Float32Array(length);
    let lowpassed = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lowpassed += 0.4 * (white - lowpassed);
      const decay = (1 - i / length) ** 3;
      let sample = lowpassed * decay;
      if (i < attack) {
        sample *= i / attack;
      }
      data[i] = sample;
    }
    impulse.copyToChannel(data, channel);
  }

  return impulse;
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
    convolver: null,
    reverbWet: null,
    bypassed: false,
  };

  connectCorePath(graph);
  return graph;
}

function cancelReverbTeardown(): void {
  if (reverbTeardownTimer) {
    clearTimeout(reverbTeardownTimer);
    reverbTeardownTimer = null;
  }
}

/**
 * Physically remove the convolver + wet gain from the live graph. Leaving the
 * convolver connected (even at wet gain 0) corrupts the dry path on
 * react-native-audio-api — the same class of bug that forced echo off
 * DelayNode — so reverb must be fully detached when disabled, not just muted.
 */
function tearDownReverbStage(g: FxGraph): void {
  cancelReverbTeardown();
  disconnectFrom(g.post, g.convolver);
  disconnectSafe(g.convolver);
  disconnectSafe(g.reverbWet);
  g.convolver = null;
  g.reverbWet = null;
  impulseSeconds = 0;
}

/** Fade already done by the caller — remove the convolver shortly after. */
function scheduleReverbTeardown(g: FxGraph): void {
  if (!g.convolver && !g.reverbWet) {
    return;
  }
  cancelReverbTeardown();
  reverbTeardownTimer = setTimeout(() => {
    reverbTeardownTimer = null;
    if (graph && !currentSettings.reverb.enabled) {
      tearDownReverbStage(graph);
    }
  }, REVERB_TEARDOWN_MS);
}

function tearDownWetStages(g: FxGraph): void {
  disconnectFrom(g.voiceBus, g.distDrive);

  disconnectSafe(g.distDrive);
  disconnectSafe(g.distFilter);
  disconnectSafe(g.distWet);

  g.distDrive = null;
  g.distFilter = null;
  g.distWet = null;

  tearDownReverbStage(g);
}

/** Cancel pending delayed echo repeats (echo off / leave piano). */
export function clearPianoEchoTimers(): void {
  for (const timer of echoTimers) {
    clearTimeout(timer);
  }
  echoTimers.clear();
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

export function resetPianoFx(): void {
  clearPianoEchoTimers();

  if (graph) {
    tearDownWetStages(graph);
    setGainImmediate(graph.dry, 1);
    setGainImmediate(graph.post, 1);
    graph.bypassed = false;
    connectCorePath(graph);
  }

  distortionFailed = false;
  reverbFailed = false;
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

function ensureReverbStage(g: FxGraph): void {
  if (g.reverbWet || reverbFailed || g.bypassed) {
    return;
  }

  try {
    const context = getSharedAudioContext();
    const convolver = context.createConvolver();
    convolver.normalize = true;
    impulseSeconds = currentSettings.reverb.timeSeconds;
    convolver.buffer = buildImpulseBuffer(impulseSeconds);
    const wet = context.createGain();
    wet.gain.value = 0;

    g.post.connect(convolver);
    convolver.connect(wet);
    wet.connect(getMasterInput());

    g.convolver = convolver;
    g.reverbWet = wet;
  } catch (error) {
    reverbFailed = true;
    console.warn('Piano FX: reverb unavailable', error);
  }
}

function applyToGraph(g: FxGraph, settings: PianoFxSettings): void {
  if (g.bypassed) {
    return;
  }

  const now = getSharedAudioContext().currentTime;
  const { distortion, reverb } = settings;

  rampGain(g.dry, 1, now);

  if (distortion.enabled) {
    ensureDistortionStage(g);
  }
  if (reverb.enabled && !reverbFailed) {
    cancelReverbTeardown();
    ensureReverbStage(g);
  }

  const reverbActive = reverb.enabled && !!g.reverbWet && !reverbFailed;
  rampGain(g.post, reverbActive ? POST_TRIM_WET : 1, now);

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

  if (
    reverb.enabled &&
    g.convolver &&
    Math.abs(reverb.timeSeconds - impulseSeconds) > 0.05
  ) {
    try {
      impulseSeconds = reverb.timeSeconds;
      g.convolver.buffer = buildImpulseBuffer(impulseSeconds);
    } catch (error) {
      console.warn('Piano FX: reverb impulse rebuild failed', error);
    }
  }
  if (g.reverbWet) {
    const mix = Math.min(reverb.mix, PIANO_FX_RANGES.mix.max);
    rampGain(g.reverbWet, reverbActive ? mix : 0, now);
  }

  // Reverb off: fade the tail (above), then detach the convolver so it cannot
  // corrupt the dry piano path. Without this the piano goes silent after the
  // user turns reverb off.
  if (!reverb.enabled || reverbFailed) {
    scheduleReverbTeardown(g);
  }
}

export function getPianoFxInput(): GainNode {
  return ensureGraph().voiceBus;
}

export function applyPianoFxSettings(settings: PianoFxSettings): void {
  const wasEchoOn = currentSettings.echo.enabled;
  currentSettings = cloneSettings(settings);

  // Turning echo off cancels pending delayed repeats immediately.
  if (wasEchoOn && !currentSettings.echo.enabled) {
    clearPianoEchoTimers();
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
