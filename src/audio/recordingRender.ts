import { getSharedAudioContext } from './sampleBank';
import { renderDryBounce } from './offlineBounce';
import { resolveDrumsDryEvents } from './dryBounce/drumsDryEvents';
import { resolveGuitarDryEvents } from './dryBounce/guitarDryEvents';
import { resolvePadsDryEvents } from './dryBounce/padsDryEvents';
import { resolvePianoDryEvents } from './dryBounce/pianoDryEvents';
import { resolveViolinDryEvents } from './dryBounce/violinDryEvents';
import type { PianoVoiceId } from '../instruments/piano/pianoVoices';
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
 * wall-clock setTimeout in the live engines and cannot be fast-forwarded.
 */
export async function renderRecordingPcm(recording: SavedRecording): Promise<RenderedPcm> {
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
        return resolvePianoDryEvents(events, recording.pianoVoiceId as PianoVoiceId | undefined);
      case 'drums':
        return resolveDrumsDryEvents(events, recording.drumKitId);
      case 'guitar':
        return resolveGuitarDryEvents(events, recording.guitarVoiceId);
      case 'violin':
        return resolveViolinDryEvents(events, recording.violinVoiceId);
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
  });
}
