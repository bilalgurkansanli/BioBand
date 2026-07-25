import { loadSample } from '../sampleBank';
import type { DryFilter, DrySampleEvent } from '../offlineBounce';
import { getViolinNoteSampleConfig, VIOLIN_SAMPLE_FILES } from '../../instruments/violin/violinSamples';
import { getMidi } from '../../instruments/violin/violinNotes';
import { getPhraseById } from '../../instruments/violin/violinPhrases';
import { parseViolinSoundId } from '../../instruments/violin/violinSounds';
import { getViolinVoice, isViolinVoiceId } from '../../instruments/violin/violinVoices';
import type { InstrumentEvent } from '../../types/recording';

/** Same stagger the live engine uses to space out a phrase's notes (violinEngine.ts). */
const PHRASE_STAGGER_MS = 220;
/** Mirrors violinEngine.ts's private NOTE_GAIN constant. */
const NOTE_GAIN = 0.36;

/** Dry (no reverb/echo) resolution of recorded violin note/phrase events into schedulable samples. */
export async function resolveViolinDryEvents(
  events: InstrumentEvent[],
  violinVoiceId?: string,
): Promise<{ sampleEvents: DrySampleEvent[]; oscillatorEvents: [] }> {
  const voiceId = isViolinVoiceId(violinVoiceId) ? violinVoiceId : 'classic';
  const voice = getViolinVoice(voiceId);
  const sampleEvents: DrySampleEvent[] = [];
  const voiceFilter: DryFilter = {
    type: voice.audio.filterType,
    frequency: voice.audio.filterFrequency,
    q: voice.audio.filterQ,
    gainDb: voice.audio.filterGainDb,
  };

  const pushNote = async (stringId: Parameters<typeof getMidi>[0], position: number, atMs: number) => {
    const midi = getMidi(stringId, position);
    const config = getViolinNoteSampleConfig(midi);
    const buffer = await loadSample(VIOLIN_SAMPLE_FILES[config.anchorId]);
    const rate = config.playbackRate * voice.audio.playbackRate;
    const gain = NOTE_GAIN * config.gainTrim * voice.audio.gainScale;
    sampleEvents.push({
      atMs,
      buffer,
      playbackRate: rate,
      gain,
      offsetSeconds: config.offsetSeconds,
      attackSeconds: 0.02,
      holdSeconds: voice.audio.holdSeconds ?? 0.45,
      releaseSeconds: voice.audio.releaseSeconds ?? 0.4,
      filters: [voiceFilter],
    });
  };

  for (const event of events) {
    const parsed = parseViolinSoundId(event.soundId);
    if (!parsed) {
      continue;
    }
    if (parsed.kind === 'note') {
      await pushNote(parsed.stringId, parsed.position, event.atMs);
      continue;
    }
    const phrase = getPhraseById(parsed.phraseId);
    if (!phrase) {
      continue;
    }
    for (let i = 0; i < phrase.notes.length; i++) {
      const note = phrase.notes[i];
      await pushNote(note.stringId, note.position, event.atMs + i * PHRASE_STAGGER_MS);
    }
  }

  return { sampleEvents, oscillatorEvents: [] };
}
