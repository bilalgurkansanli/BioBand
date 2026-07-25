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
//
// IMPORTANT: Web Audio WaveShaper maps input [-1, 1] to curve values.  Any
// signal above 1.0 hard-clips to the last curve sample.  Using tanh(3x)
// instead of tanh(x) means the curve is nearly flat (saturated) well before
// ±1 — so the transition at the boundary is imperceptible even if the
// signal slightly exceeds the range.
const MASTER_HEADROOM = 0.55;
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
  const resolution = 4096;
  const curve = new Float32Array(resolution);
  for (let i = 0; i < resolution; i++) {
    const x = (i / (resolution - 1)) * 2 - 1;
    // tanh(3x) saturates at ≈ ±0.995 by x = ±1, leaving almost no
    // amplitude step at the [-1, 1] boundary → no audible hard clip.
    curve[i] = Math.tanh(3 * x);
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
/** Dry notes + FX taps; keep high enough for multi-touch chords. */
const MAX_VOICES = 16;
const VOICE_HOLD_SECONDS = 3;
const VOICE_RELEASE_SECONDS = 1.5;
const STEAL_FADE_SECONDS = 0.1;
/** Interactive held notes (finger/sustain) — released via releaseVoiceByTag. */
const HELD_VOICE_SECONDS = 28;
const NOTE_OFF_FADE_SECONDS = 0.28;

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
  /**
   * Context time the voice begins sounding. Song playback registers voices
   * slightly ahead of the clock, so this is not always "now" — fading one out
   * before it starts would stop it before its own start() and lose the note.
   */
  startsAt: number;
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

function stealVoice(voice: ActiveVoice, at: number): void {
  try {
    if (voice.startsAt > at) {
      // Scheduled but not sounding yet: there is nothing to fade, and a ramp
      // placed before its own start would leave the node stopped before it
      // plays. Ending it at its start time simply means it never sounds.
      // Strictly greater — two triggers landing in the same clock tick must
      // still cross-fade rather than silence the first outright.
      voice.node.stop(voice.startsAt);
      return;
    }
    voice.stealGain.gain.setValueAtTime(1, at);
    voice.stealGain.gain.linearRampToValueAtTime(0.0001, at + STEAL_FADE_SECONDS);
    voice.node.stop(at + STEAL_FADE_SECONDS + 0.01);
  } catch {
    // Voice already stopped on its own — nothing to fade.
  }
}

function stealOldestVoice(now: number): void {
  const isReverb = (voice: ActiveVoice): boolean =>
    voice.tag?.includes(':reverb') === true;
  const isEcho = (voice: ActiveVoice): boolean =>
    voice.tag?.includes(':echo') === true;
  const sounding = (voice: ActiveVoice): boolean => voice.startsAt <= now;

  // Give up the least valuable voice first: reverb wash, then echo repeats,
  // then dry notes — and within each, one already heard before one still
  // waiting on the clock, since stealing a pending note loses it entirely
  // rather than shortening it. Without the echo tiers a dense passage culls
  // dry notes to keep repeats of them alive, which is backwards.
  const priorities: ((voice: ActiveVoice) => boolean)[] = [
    (voice) => isReverb(voice) && sounding(voice),
    isReverb,
    (voice) => isEcho(voice) && sounding(voice),
    isEcho,
    sounding,
  ];

  let index = 0;
  for (const matches of priorities) {
    const found = activeVoices.findIndex(matches);
    if (found >= 0) {
      index = found;
      break;
    }
  }

  const [voice] = activeVoices.splice(index, 1);
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
 *
 * `startsAt` is the context time the new voice begins sounding. For notes
 * scheduled ahead of the clock (song playback), the same-tag fade must start
 * just before *that* moment, not immediately — otherwise scheduling a repeat
 * of a note cuts the currently ringing one short by the whole lookahead.
 */
export function registerActiveVoice(
  node: StoppableNode,
  stealGain: GainNodeT,
  endsAt: number,
  tag?: string,
  startsAt?: number,
): void {
  const now = getAudioContext().currentTime;
  pruneFinishedVoices(now);

  if (tag) {
    const fadeAt = Math.max(now, (startsAt ?? now) - STEAL_FADE_SECONDS);
    for (let i = activeVoices.length - 1; i >= 0; i--) {
      if (activeVoices[i].tag === tag) {
        const [voice] = activeVoices.splice(i, 1);
        stealVoice(voice, fadeAt);
      }
    }
  }

  while (activeVoices.length >= MAX_VOICES) {
    stealOldestVoice(now);
  }
  activeVoices.push({ node, stealGain, endsAt, startsAt: startsAt ?? now, tag });
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

function releaseMatchingVoices(
  matches: (tag: string) => boolean,
  fadeSeconds: number,
): boolean {
  const now = getAudioContext().currentTime;
  pruneFinishedVoices(now);
  let released = false;

  for (let i = activeVoices.length - 1; i >= 0; i--) {
    const tag = activeVoices[i].tag;
    if (tag === undefined || !matches(tag)) {
      continue;
    }
    const [voice] = activeVoices.splice(i, 1);
    try {
      if (voice.startsAt > now) {
        // Not sounding yet — end it at its start rather than ramping in the past.
        voice.node.stop(voice.startsAt);
      } else {
        voice.stealGain.gain.cancelScheduledValues(now);
        voice.stealGain.gain.setValueAtTime(voice.stealGain.gain.value || 1, now);
        voice.stealGain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
        voice.node.stop(now + fadeSeconds + 0.02);
      }
    } catch {
      // Already stopped.
    }
    released = true;
  }

  return released;
}

/**
 * Soft-release every voice with the given tag (note-off / sustain pedal up).
 * Returns true if at least one voice was released.
 */
export function releaseVoiceByTag(
  tag: string,
  fadeSeconds = NOTE_OFF_FADE_SECONDS,
): boolean {
  return releaseMatchingVoices((t) => t === tag, fadeSeconds);
}

/**
 * Soft-release every voice whose tag starts with `prefix` — for choke groups
 * where each trigger gets a unique tag (e.g. "drums:hihatOpen#12" and its
 * ":reverb:"/":echo" taps all die when the closed hat chokes the open one).
 */
export function releaseVoicesByTagPrefix(
  prefix: string,
  fadeSeconds = NOTE_OFF_FADE_SECONDS,
): boolean {
  return releaseMatchingVoices((t) => t.startsWith(prefix), fadeSeconds);
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

export type PlaySampleOptions = {
  /**
   * Medium hold/release for reverb taps — long enough to hear the wash,
   * short enough to protect polyphony. Echo must NOT use this.
   */
  shortTail?: boolean;
  /**
   * Finger/sustain held note — long ceiling; end with releaseVoiceByTag.
   */
  held?: boolean;
  /** Override default attack ramp (seconds). */
  attackSeconds?: number;
  /** Override how long the voice stays at full gain before release. */
  holdSeconds?: number;
  /** Override fade-out length after hold. */
  releaseSeconds?: number;
  /**
   * Start playback this far into the buffer — for recordings whose first
   * seconds are a slow swell (violin arco), skipping to the developed tone.
   */
  offsetSeconds?: number;
  /**
   * Absolute context time (seconds) at which the note should sound. Omit for
   * "right now" — interactive playing must stay immediate. Song playback
   * schedules a short lookahead ahead of the clock so note onsets land on the
   * audio thread's own timeline instead of whenever the JS thread gets around
   * to firing a timer.
   */
  startAtSeconds?: number;
};

export type PlayedSampleHandle = {
  /** Live pitch control for the ringing voice (guitar bend / vibrato). */
  setPlaybackRate: (rate: number) => void;
};

export function playSample(
  buffer: AudioBuffer,
  playbackRate = 1,
  gain = DEFAULT_SAMPLE_GAIN,
  output?: AudioNodeT,
  tag?: string,
  options?: PlaySampleOptions,
): PlayedSampleHandle {
  const context = getAudioContext();
  // Never schedule into the past — a stale lookahead target would make the
  // envelope ramps run backwards and the note would click or drop out.
  const now = Math.max(context.currentTime, options?.startAtSeconds ?? 0);

  const holdSeconds =
    options?.holdSeconds ??
    (options?.held
      ? HELD_VOICE_SECONDS
      : options?.shortTail
        ? 0.9
        : VOICE_HOLD_SECONDS);
  const releaseSeconds =
    options?.releaseSeconds ??
    (options?.held ? 0.4 : options?.shortTail ? 0.55 : VOICE_RELEASE_SECONDS);
  const attackSeconds = Math.max(
    0.0005,
    options?.attackSeconds ?? ATTACK_SECONDS,
  );

  // Hold at full gain, then release to silence and stop the node, so long
  // sample tails never accumulate. Short samples simply end earlier.
  const releaseStart = now + holdSeconds;
  const endsAt = releaseStart + releaseSeconds;
  const stopAt = endsAt + 0.05;

  const node = context.createBufferSource();
  node.buffer = buffer;
  node.playbackRate.value = playbackRate;

  const noteGain = context.createGain();
  // Short attack avoids clicks when the sample does not start at a zero crossing.
  noteGain.gain.setValueAtTime(0.0001, now);
  noteGain.gain.linearRampToValueAtTime(gain, now + attackSeconds);
  noteGain.gain.setValueAtTime(gain, releaseStart);
  noteGain.gain.linearRampToValueAtTime(0.0001, endsAt);

  const stealGain = context.createGain();

  node.connect(noteGain);
  noteGain.connect(stealGain);
  stealGain.connect(output ?? getMasterGain(context));

  const offsetSeconds = Math.min(
    Math.max(0, options?.offsetSeconds ?? 0),
    Math.max(0, buffer.duration - 0.25),
  );
  if (offsetSeconds > 0) {
    node.start(now, offsetSeconds);
  } else {
    node.start(now);
  }
  node.stop(stopAt);

  registerActiveVoice(node, stealGain, stopAt, tag, now);

  return {
    setPlaybackRate: (rate: number) => {
      try {
        node.playbackRate.value = rate;
      } catch {
        // Voice already ended.
      }
    },
  };
}

export async function prepareSamplePlayback(): Promise<void> {
  await restorePlaybackAudioMode();
  if (getAudioContext().state === 'suspended') {
    await getAudioContext().resume();
  }
}
