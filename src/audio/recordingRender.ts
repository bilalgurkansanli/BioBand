import { getSharedAudioContext } from './sampleBank';
import { renderDryBounce } from './offlineBounce';
import { resolveDrumsDryEvents } from './dryBounce/drumsDryEvents';
import { resolveGuitarDryEvents } from './dryBounce/guitarDryEvents';
import { resolvePadsDryEvents } from './dryBounce/padsDryEvents';
import { resolvePianoDryEvents } from './dryBounce/pianoDryEvents';
import { resolveViolinDryEvents } from './dryBounce/violinDryEvents';
import type { SavedRecording } from '../types/recording';

export type RenderedPcm = {
  channels: Float32Array[];
  sampleRate: number;
};

export class UnrenderableRecordingError extends Error {
  constructor(message = 'This recording has no audio to render.') {
    super(message);
    this.name = 'UnrenderableRecordingError';
  }
}

/**
 * Renders a saved recording to real PCM audio.
 * Microphone takes: decodes the already-captured audio file.
 * Instrument-mode takes: dry-bounces the note events through an
 * OfflineAudioContext — no reverb/echo, since those are scheduled via
 * wall-clock setTimeout in the live engines and cannot be fast-forwarded —
 * but through the live master chain, so it sounds as loud as it played.
 */
export async function renderRecordingPcm(
  recording: SavedRecording,
  options: {
    /** Instrument takes: gain ahead of the master chain (Studio track volume). */
    gainScale?: number;
    /**
     * Tempo the events' times were already scaled to (Studio BPM). Only what
     * the events cannot carry themselves follows it — a violin phrase
     * preset's note spacing.
     */
    tempoRate?: number;
    shouldCancel?: () => boolean;
  } = {},
): Promise<RenderedPcm> {
  if (recording.mode === 'microphone') {
    if (!recording.audioUri) {
      throw new UnrenderableRecordingError();
    }
    const buffer = await getSharedAudioContext().decodeAudioData(recording.audioUri);
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      channels.push(buffer.getChannelData(ch));
    }
    return { channels, sampleRate: buffer.sampleRate };
  }

  const events = recording.events ?? [];
  if (events.length === 0) {
    throw new UnrenderableRecordingError();
  }

  const { sampleEvents, oscillatorEvents } = await (() => {
    switch (recording.instrument) {
      case 'piano':
        return resolvePianoDryEvents(events, recording.pianoVoiceId);
      case 'drums':
        return resolveDrumsDryEvents(events, recording.drumKitId);
      case 'guitar':
        return resolveGuitarDryEvents(events, recording.guitarVoiceId);
      case 'violin':
        return resolveViolinDryEvents(events, recording.violinVoiceId, options.tempoRate);
      case 'pads':
        return resolvePadsDryEvents(events, recording.padBankId);
    }
  })();

  if (sampleEvents.length === 0 && oscillatorEvents.length === 0) {
    throw new UnrenderableRecordingError();
  }

  return renderDryBounce({
    durationMs: recording.durationMs,
    sampleEvents,
    oscillatorEvents,
    inputGain: options.gainScale,
    shouldCancel: options.shouldCancel,
  });
}
