import { OfflineAudioContext, type AudioBuffer as AudioBufferT, type AudioNode } from './audioApi';

export type DryFilter = {
  type: 'lowpass' | 'highpass' | 'peaking' | 'lowshelf' | 'highshelf';
  frequency: number;
  q?: number;
  /** dB, only meaningful for 'peaking'/'lowshelf'/'highshelf'. */
  gainDb?: number;
};

/** A single sampled note to render — dry only, no reverb/echo taps. */
export type DrySampleEvent = {
  atMs: number;
  buffer: AudioBufferT;
  playbackRate?: number;
  gain?: number;
  offsetSeconds?: number;
  /** Envelope — defaults mirror sampleBank.ts's non-held one-shot defaults. */
  attackSeconds?: number;
  holdSeconds?: number;
  releaseSeconds?: number;
  /**
   * Kit/voice tone-shaping EQ — mirrors the live engine's bus filter(s),
   * applied in series in array order (e.g. drums' crash/ride pass through a
   * fixed cymbal-tone rounding filter, then the kit's own EQ).
   */
  filters?: DryFilter[];
};

/** A single synthesized (oscillator) note — for piano's organ/rhodes/synth voices. */
export type DryOscillatorEvent = {
  atMs: number;
  frequency: number;
  durationMs: number;
  gain?: number;
  waveform?: 'sine' | 'sawtooth' | 'square' | 'triangle';
  /** Extra harmonic partials (ratio, level) layered on top of the fundamental. */
  partials?: { ratio: number; level: number }[];
  /** Seconds held at peak gain before the release ramp — 0 for a pluck-style decay. */
  sustainSeconds?: number;
};

export type BounceResult = {
  channels: Float32Array[];
  sampleRate: number;
};

const DEFAULT_ATTACK_SECONDS = 0.004;
const DEFAULT_HOLD_SECONDS = 3;
const DEFAULT_RELEASE_SECONDS = 1.5;
const MIN_TAIL_SECONDS = 0.6;
const STOP_GUARD_SECONDS = 0.1;

function sampleEventEndSeconds(event: DrySampleEvent): number {
  const start = event.atMs / 1000;
  const hold = event.holdSeconds ?? DEFAULT_HOLD_SECONDS;
  const release = event.releaseSeconds ?? DEFAULT_RELEASE_SECONDS;
  return start + hold + release + STOP_GUARD_SECONDS;
}

function oscillatorEventEndSeconds(event: DryOscillatorEvent): number {
  return event.atMs / 1000 + event.durationMs / 1000 + STOP_GUARD_SECONDS;
}

/**
 * Renders a set of note events into real PCM audio using an OfflineAudioContext
 * — much faster than real time, but with no reverb/echo (those are scheduled via
 * wall-clock setTimeout in the live engines and cannot be fast-forwarded).
 */
export async function renderDryBounce(params: {
  durationMs: number;
  sampleEvents: DrySampleEvent[];
  oscillatorEvents?: DryOscillatorEvent[];
  sampleRate?: number;
  numberOfChannels?: number;
}): Promise<BounceResult> {
  const sampleRate = params.sampleRate ?? 44100;
  const numberOfChannels = params.numberOfChannels ?? 2;

  // Sized to the longest-ringing note's actual decay, not a fixed tail — a
  // long-sustain voice (e.g. guitar's clean/warm presets hold 3+ seconds)
  // would otherwise get truncated mid-decay by an undersized buffer.
  const naturalEndSeconds = Math.max(
    params.durationMs / 1000 + MIN_TAIL_SECONDS,
    ...params.sampleEvents.map(sampleEventEndSeconds),
    ...(params.oscillatorEvents ?? []).map(oscillatorEventEndSeconds),
  );
  const length = Math.ceil(Math.max(0.05, naturalEndSeconds) * sampleRate);

  const context = new OfflineAudioContext(numberOfChannels, length, sampleRate);

  for (const event of params.sampleEvents) {
    const source = context.createBufferSource();
    source.buffer = event.buffer;
    source.playbackRate.value = event.playbackRate ?? 1;

    const attackSeconds = Math.max(0.0005, event.attackSeconds ?? DEFAULT_ATTACK_SECONDS);
    const holdSeconds = event.holdSeconds ?? DEFAULT_HOLD_SECONDS;
    const releaseSeconds = event.releaseSeconds ?? DEFAULT_RELEASE_SECONDS;
    const gain = event.gain ?? 1;

    const startAt = Math.max(0, event.atMs / 1000);
    const releaseStart = startAt + holdSeconds;
    const endsAt = releaseStart + releaseSeconds;
    const stopAt = endsAt + 0.05;

    const noteGain = context.createGain();
    noteGain.gain.setValueAtTime(0.0001, startAt);
    noteGain.gain.linearRampToValueAtTime(gain, startAt + attackSeconds);
    noteGain.gain.setValueAtTime(gain, releaseStart);
    noteGain.gain.linearRampToValueAtTime(0.0001, endsAt);

    source.connect(noteGain);

    let outputNode: AudioNode = noteGain;
    for (const filter of event.filters ?? []) {
      const filterNode = context.createBiquadFilter();
      filterNode.type = filter.type;
      filterNode.frequency.value = filter.frequency;
      filterNode.Q.value = filter.q ?? 0.7;
      if (filter.gainDb !== undefined) {
        filterNode.gain.value = filter.gainDb;
      }
      outputNode.connect(filterNode);
      outputNode = filterNode;
    }
    outputNode.connect(context.destination);

    if (event.offsetSeconds && event.offsetSeconds > 0) {
      source.start(startAt, event.offsetSeconds);
    } else {
      source.start(startAt);
    }
    source.stop(stopAt);
  }

  for (const event of params.oscillatorEvents ?? []) {
    const startAt = Math.max(0, event.atMs / 1000);
    const sustainSeconds = Math.max(0, event.sustainSeconds ?? 0);
    const releaseStart = startAt + sustainSeconds + Math.max(0.01, event.durationMs / 1000 - sustainSeconds);
    const endAt = releaseStart;
    const peak = event.gain ?? 0.2;
    const partials = event.partials ?? [{ ratio: 1, level: 1 }];

    const noteGain = context.createGain();
    noteGain.gain.setValueAtTime(0.0001, startAt);
    noteGain.gain.linearRampToValueAtTime(peak, startAt + 0.012);
    if (sustainSeconds > 0) {
      noteGain.gain.setValueAtTime(peak, startAt + sustainSeconds);
    }
    noteGain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    noteGain.connect(context.destination);

    for (const partial of partials) {
      const osc = context.createOscillator();
      osc.type = event.waveform ?? 'sine';
      osc.frequency.value = event.frequency * partial.ratio;

      const partialGain = context.createGain();
      partialGain.gain.value = partial.level;

      osc.connect(partialGain);
      partialGain.connect(noteGain);
      osc.start(startAt);
      osc.stop(endAt + 0.05);
    }
  }

  const rendered = await context.startRendering();
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
    channels.push(rendered.getChannelData(ch));
  }
  return { channels, sampleRate: rendered.sampleRate };
}
