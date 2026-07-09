import {
  AudioContext,
  type AudioBuffer,
  type AudioNode,
  type GainNode,
} from './audioApi';

import { restorePlaybackAudioMode } from './initAudio';

// One shared AudioContext for the whole app. Web Audio buffer sources are
// single-use and self-cleaning, so playing a sample never needs a pool of
// players — just decode each sample once and spin up a fresh source node
// per trigger, which is what makes concurrent/rapid retriggering reliable.
let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

type GainNodeT = GainNode;
type AudioNodeT = AudioNode;
type StoppableNode = { stop: (when?: number) => void };

// All samples route through a shared master gain that leaves headroom, then
// a tanh soft-clipper. When overlapping notes sum past the ceiling anyway,
// the waveshaper rounds the peaks off smoothly instead of letting the DAC
// hard-clip them into harsh digital crackle.
const MASTER_HEADROOM = 0.7;
const DEFAULT_SAMPLE_GAIN = 0.55;
const ATTACK_SECONDS = 0.004;
let masterGain: GainNodeT | null = null;
let masterVolume = 1;

/** User-facing output volume (0..1); multiplied under the fixed headroom. */
export function setMasterVolume(volume: number): void {
  masterVolume = Math.max(0, Math.min(1, volume));
  if (masterGain) {
    masterGain.gain.value = MASTER_HEADROOM * masterVolume;
  }
}

export function getMasterVolume(): number {
  return masterVolume;
}

function buildSoftClipCurve(): Float32Array {
  const resolution = 2048;
  const curve = new Float32Array(resolution);
  for (let i = 0; i < resolution; i++) {
    const x = (i / (resolution - 1)) * 2 - 1;
    curve[i] = Math.tanh(x);
  }
  return curve;
}

function getMasterGain(context: AudioContext): GainNodeT {
  if (!masterGain) {
    masterGain = context.createGain();
    masterGain.gain.value = MASTER_HEADROOM * masterVolume;

    // The limiter is an enhancement — if the backend cannot build it, the
    // master connects straight to the speakers so sound always works.
    try {
      const limiter = context.createWaveShaper();
      limiter.curve = buildSoftClipCurve();
      limiter.connect(context.destination);
      masterGain.connect(limiter);
    } catch (error) {
      console.warn('Audio: soft-clip limiter unavailable', error);
      masterGain.connect(context.destination);
    }
  }
  return masterGain;
}

/** Shared context for engines that build custom node graphs (synth voices). */
export function getSharedAudioContext(): AudioContext {
  return getAudioContext();
}

/** Master output every voice must feed into — keeps the headroom applied. */
export function getMasterInput(): GainNodeT {
  return getMasterGain(getAudioContext());
}

// Piano-style samples have tails that run 10+ seconds, so rapid playing used
// to stack dozens of live source nodes. That overloads the audio render
// thread (dropouts heard as crackling) and sums into clipping. Every voice is
// therefore tracked: polyphony is capped by stealing the oldest voice, and
// each voice fades out after a few seconds — inaudible for decaying samples,
// but it keeps the render load flat no matter how fast the user plays.
const MAX_VOICES = 10;
const VOICE_HOLD_SECONDS = 3;
const VOICE_RELEASE_SECONDS = 1.5;
const STEAL_FADE_SECONDS = 0.1;

type ActiveVoice = {
  node: StoppableNode;
  /**
   * Dedicated constant-1 gain in series with the voice, used ONLY for the
   * steal fade. Fading a separate node (instead of the envelope gain) means
   * the fade always starts from exactly 1 — no discontinuity, no click,
   * regardless of what the voice's own envelope is doing at that moment.
   */
  stealGain: GainNodeT;
  /** Context time at which this voice is guaranteed silent and stopped. */
  endsAt: number;
  /** Optional identity (e.g. "organ:C4") for same-note retrigger stealing. */
  tag?: string;
};

// Ordered oldest-first; playSample both prunes finished voices and steals
// the oldest one when the cap is hit.
const activeVoices: ActiveVoice[] = [];

function pruneFinishedVoices(now: number): void {
  for (let i = activeVoices.length - 1; i >= 0; i--) {
    if (activeVoices[i].endsAt <= now) {
      activeVoices.splice(i, 1);
    }
  }
}

function stealVoice(voice: ActiveVoice, now: number): void {
  try {
    voice.stealGain.gain.setValueAtTime(1, now);
    voice.stealGain.gain.linearRampToValueAtTime(0.0001, now + STEAL_FADE_SECONDS);
    voice.node.stop(now + STEAL_FADE_SECONDS + 0.01);
  } catch {
    // Voice already stopped on its own — nothing to fade.
  }
}

function stealOldestVoice(now: number): void {
  const voice = activeVoices.shift();
  if (voice) {
    stealVoice(voice, now);
  }
}

/**
 * Enrolls a voice in the shared polyphony budget. `stealGain` must be a
 * dedicated series gain kept at 1 (see ActiveVoice.stealGain) and `endsAt`
 * a context time at which the voice is silent and stopped. When `tag` is
 * given, any still-ringing voice with the same tag is faded out first —
 * retriggering a key replaces its old sound instead of stacking on it.
 */
export function registerActiveVoice(
  node: StoppableNode,
  stealGain: GainNodeT,
  endsAt: number,
  tag?: string,
): void {
  const now = getAudioContext().currentTime;
  pruneFinishedVoices(now);

  if (tag) {
    for (let i = activeVoices.length - 1; i >= 0; i--) {
      if (activeVoices[i].tag === tag) {
        const [voice] = activeVoices.splice(i, 1);
        stealVoice(voice, now);
      }
    }
  }

  while (activeVoices.length >= MAX_VOICES) {
    stealOldestVoice(now);
  }
  activeVoices.push({ node, stealGain, endsAt, tag });
}

/** Fade out and stop every active voice — used when leaving an instrument. */
export function stopAllVoices(): void {
  const now = getAudioContext().currentTime;
  while (activeVoices.length > 0) {
    const voice = activeVoices.shift();
    if (voice) {
      stealVoice(voice, now);
    }
  }
}

const bufferCache = new Map<number, Promise<AudioBuffer>>();

export function loadSample(source: number): Promise<AudioBuffer> {
  const cached = bufferCache.get(source);
  if (cached) {
    return cached;
  }

  const loading = getAudioContext().decodeAudioData(source);
  bufferCache.set(source, loading);
  return loading;
}

export function playSample(
  buffer: AudioBuffer,
  playbackRate = 1,
  gain = DEFAULT_SAMPLE_GAIN,
  output?: AudioNodeT,
  tag?: string,
): void {
  const context = getAudioContext();
  const now = context.currentTime;

  const node = context.createBufferSource();
  node.buffer = buffer;
  node.playbackRate.value = playbackRate;

  // Hold at full gain, then release to silence and stop the node, so long
  // sample tails never accumulate. Short samples simply end earlier.
  const releaseStart = now + VOICE_HOLD_SECONDS;
  const endsAt = releaseStart + VOICE_RELEASE_SECONDS;

  const noteGain = context.createGain();
  // Short attack avoids clicks when the sample does not start at a zero crossing.
  noteGain.gain.setValueAtTime(0.0001, now);
  noteGain.gain.linearRampToValueAtTime(gain, now + ATTACK_SECONDS);
  noteGain.gain.setValueAtTime(gain, releaseStart);
  noteGain.gain.linearRampToValueAtTime(0.0001, endsAt);

  const stealGain = context.createGain();

  node.connect(noteGain);
  noteGain.connect(stealGain);
  stealGain.connect(output ?? getMasterGain(context));

  node.start(now);
  node.stop(endsAt + 0.05);

  registerActiveVoice(node, stealGain, endsAt + 0.05, tag);
}

export async function prepareSamplePlayback(): Promise<void> {
  await restorePlaybackAudioMode();
  if (getAudioContext().state === 'suspended') {
    await getAudioContext().resume();
  }
}
