import { loadSample } from '../sampleBank';
import type { DrySampleEvent } from '../offlineBounce';
import { getChordById, isChordId } from '../../instruments/guitar/guitarChords';
import {
  buildChordPatternSteps,
  isGuitarChordPlayMode,
  type GuitarChordGesture,
  type GuitarChordPlayMode,
} from '../../instruments/guitar/guitarChordPatterns';
import { getGuitarNoteSampleConfig, type GuitarSampleBankId } from '../../instruments/guitar/guitarSamples';
import { fretToMidi, type GuitarStringId } from '../../instruments/guitar/guitarSounds';
import {
  guitarGainScaleForVelocity,
} from '../../instruments/guitar/guitarVelocity';
import { guitarStringGainBalance } from '../../instruments/guitar/guitarBalance';
import { getGuitarVoice, isGuitarVoiceId, type GuitarVoiceId } from '../../instruments/guitar/guitarVoices';
import type { InstrumentEvent } from '../../types/recording';

/** Mirrors guitarEngine.ts's private STRING_GAIN constant. */
const STRING_GAIN = 0.42;

function sampleBankForVoice(voiceId: GuitarVoiceId): GuitarSampleBankId {
  return voiceId === 'electric' ? 'electric' : 'acoustic';
}

/** Dry (no reverb/echo) resolution of recorded guitar pluck/chord events into schedulable samples. */
export async function resolveGuitarDryEvents(
  events: InstrumentEvent[],
  guitarVoiceId?: string,
): Promise<{ sampleEvents: DrySampleEvent[]; oscillatorEvents: [] }> {
  const voiceId = isGuitarVoiceId(guitarVoiceId) ? guitarVoiceId : 'nylon';
  const voice = getGuitarVoice(voiceId);
  const bank = sampleBankForVoice(voiceId);
  const sampleEvents: DrySampleEvent[] = [];

  const pushString = async (stringId: GuitarStringId, midi: number, velocity: number, atMs: number) => {
    const config = getGuitarNoteSampleConfig(midi, bank);
    const buffer = await loadSample(config.source);
    const rate = config.playbackRate * voice.audio.playbackRate;
    const gain =
      STRING_GAIN *
      guitarGainScaleForVelocity(velocity) *
      guitarStringGainBalance(stringId) *
      voice.audio.gainScale;
    sampleEvents.push({ atMs, buffer, playbackRate: rate, gain });
  };

  for (const event of events) {
    const soundId = event.soundId;
    const velocity = event.velocity ?? 0.72;

    if (soundId.startsWith('chord:')) {
      const [chordId, modeRaw, directionRaw, gestureRaw] = soundId.slice('chord:'.length).split(':');
      if (!isChordId(chordId)) {
        continue;
      }
      const chord = getChordById(chordId);
      if (!chord) {
        continue;
      }
      const mode: GuitarChordPlayMode = isGuitarChordPlayMode(modeRaw ?? '') ? (modeRaw as GuitarChordPlayMode) : 'strum';
      const direction: 'up' | 'down' = directionRaw === 'up' ? 'up' : 'down';
      const gesture: GuitarChordGesture = gestureRaw === 'tap' ? 'tap' : 'swipe';
      const steps = buildChordPatternSteps(chord, mode, direction, gesture);
      for (const step of steps) {
        await pushString(step.stringId, step.midi, step.velocity, event.atMs + step.atMs);
      }
      continue;
    }

    const midiMatch = soundId.match(/^midi:(\d{1,3})$/);
    if (midiMatch) {
      await pushString('s6', Number(midiMatch[1]), velocity, event.atMs);
      continue;
    }

    const fretted = soundId.match(/^(s[1-6]):f(\d{1,2})$/);
    if (fretted) {
      const stringId = fretted[1] as GuitarStringId;
      const midi = fretToMidi(stringId, Number(fretted[2]));
      await pushString(stringId, midi, velocity, event.atMs);
      continue;
    }

    if (/^s[1-6]$/.test(soundId)) {
      const stringId = soundId as GuitarStringId;
      const midi = fretToMidi(stringId, 0);
      await pushString(stringId, midi, velocity, event.atMs);
    }
  }

  return { sampleEvents, oscillatorEvents: [] };
}
