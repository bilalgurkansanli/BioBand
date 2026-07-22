import { OfflineAudioContext, type AudioBuffer as AudioBufferT } from './audioApi';

/** A single sampled note to render — dry only, no reverb/echo taps. */
export type DrySampleEvent = {
  atMs: number;
  buffer: AudioBufferT;
  playbackRate?: number;
  gain?: number;
  offsetSeconds?: number;
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
};

export type BounceResult = {
  channels: Float32Array[];
  sampleRate: number;
};

const TAIL_SECONDS = 0.6;

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
  const lengthSeconds = Math.max(0.05, params.durationMs / 1000 + TAIL_SECONDS);
  const length = Math.ceil(lengthSeconds * sampleRate);

  const context = new OfflineAudioContext(numberOfChannels, length, sampleRate);

  for (const event of params.sampleEvents) {
    const source = context.createBufferSource();
    source.buffer = event.buffer;
    source.playbackRate.value = event.playbackRate ?? 1;

    const gainNode = context.createGain();
    gainNode.gain.value = event.gain ?? 1;

    source.connect(gainNode);
    gainNode.connect(context.destination);

    const startAt = Math.max(0, event.atMs / 1000);
    if (event.offsetSeconds && event.offsetSeconds > 0) {
      source.start(startAt, event.offsetSeconds);
    } else {
      source.start(startAt);
    }
  }

  for (const event of params.oscillatorEvents ?? []) {
    const startAt = Math.max(0, event.atMs / 1000);
    const endAt = startAt + Math.max(0.05, event.durationMs / 1000);
    const peak = event.gain ?? 0.2;
    const partials = event.partials ?? [{ ratio: 1, level: 1 }];

    const noteGain = context.createGain();
    noteGain.gain.setValueAtTime(0.0001, startAt);
    noteGain.gain.linearRampToValueAtTime(peak, startAt + 0.012);
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
