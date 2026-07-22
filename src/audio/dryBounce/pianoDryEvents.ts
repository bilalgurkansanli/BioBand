import { loadSample } from '../sampleBank';
import type { DryOscillatorEvent, DrySampleEvent } from '../offlineBounce';
import { BASE_SAMPLE_FILES, getNoteSampleConfig } from '../../instruments/piano/pianoSamples';
import { PIANO_NOTES, type NoteId } from '../../instruments/piano/pianoNotes';
import type { PianoVoiceId } from '../../instruments/piano/pianoVoices';
import type { InstrumentEvent } from '../../types/recording';

const noteMidis = new Map<NoteId, number>(PIANO_NOTES.map((note) => [note.id, note.midi]));

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Mirrors pianoEngine.ts's bass-scale curves (they vary slightly per synth voice —
 * this shared approximation is fine for a dry export, not the live interactive feel). */
function bassScale(frequency: number): number {
  return frequency < 180 ? 0.5 : frequency < 280 ? 0.65 : frequency < 400 ? 0.82 : 1;
}

/**
 * Dry (no reverb/echo) resolution of recorded piano note events into schedulable
 * samples/oscillators. Recordings don't remember which voice they were made
 * with (piano has no `pianoVoiceId` field, unlike the other instruments), so
 * the voice must be supplied explicitly — defaults to `acoustic`.
 */
export async function resolvePianoDryEvents(
  events: InstrumentEvent[],
  voice: PianoVoiceId = 'acoustic',
): Promise<{ sampleEvents: DrySampleEvent[]; oscillatorEvents: DryOscillatorEvent[] }> {
  const sampleEvents: DrySampleEvent[] = [];
  const oscillatorEvents: DryOscillatorEvent[] = [];

  for (const event of events) {
    const midi = noteMidis.get(event.soundId as NoteId);
    if (midi === undefined) {
      continue;
    }

    if (voice === 'acoustic' || voice === 'bright' || voice === 'musicBox') {
      const effectiveMidi = voice === 'musicBox' ? midi + 12 : midi;
      const gain = voice === 'acoustic' ? 0.55 : voice === 'bright' ? 0.5 : 0.45;
      const config = getNoteSampleConfig(effectiveMidi);
      const buffer = await loadSample(BASE_SAMPLE_FILES[config.anchorId]);
      sampleEvents.push({
        atMs: event.atMs,
        buffer,
        playbackRate: config.playbackRate,
        gain,
      });
      continue;
    }

    const frequency = midiToFrequency(midi);
    const scale = bassScale(frequency);

    if (voice === 'organ') {
      oscillatorEvents.push({
        atMs: event.atMs,
        frequency,
        durationMs: 530,
        gain: 0.8,
        waveform: 'sine',
        partials: [
          { ratio: 1, level: 0.055 * scale },
          { ratio: 2, level: 0.028 * scale },
          { ratio: 3, level: 0.014 * scale },
        ],
      });
    } else if (voice === 'rhodes') {
      oscillatorEvents.push({
        atMs: event.atMs,
        frequency,
        durationMs: 1000,
        gain: 0.13 * scale,
        waveform: 'sine',
        partials: [
          { ratio: 1, level: 1 },
          { ratio: 4, level: 0.032 / 0.13 },
        ],
      });
    } else if (voice === 'synth') {
      oscillatorEvents.push({
        atMs: event.atMs,
        frequency,
        durationMs: 800,
        gain: 0.18 * scale,
        waveform: 'sawtooth',
        partials: [{ ratio: 1, level: 1 }],
      });
    }
  }

  return { sampleEvents, oscillatorEvents };
}
