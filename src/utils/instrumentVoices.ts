// One place to list the selectable "voices" (timbres) per instrument for the
// studio track settings, and to map a chosen voice back onto the right
// StudioTrack field.

import { DRUM_KITS } from '../instruments/drums/drumsKits';
import { GUITAR_VOICES } from '../instruments/guitar/guitarVoices';
import { PAD_BANKS } from '../instruments/pads/padsBanks';
import { PIANO_VOICES } from '../instruments/piano/pianoVoices';
import { VIOLIN_VOICES } from '../instruments/violin/violinVoices';
import type { InstrumentId } from '../types/recording';
import type { StudioTrack } from '../types/studio';

export type VoiceOption = {
  id: string;
  /** Emoji shown in the picker. */
  icon: string;
  labelKey: string;
};

/** StudioTrack field that stores the chosen voice/kit/bank per instrument. */
export const INSTRUMENT_VOICE_FIELD: Record<
  InstrumentId,
  'pianoVoiceId' | 'guitarVoiceId' | 'violinVoiceId' | 'drumKitId' | 'padBankId'
> = {
  piano: 'pianoVoiceId',
  guitar: 'guitarVoiceId',
  violin: 'violinVoiceId',
  drums: 'drumKitId',
  pads: 'padBankId',
};

export function getInstrumentVoices(instrument: InstrumentId): VoiceOption[] {
  const pick = (list: { id: string; icon: string; labelKey: string }[]): VoiceOption[] =>
    list.map((entry) => ({ id: entry.id, icon: entry.icon, labelKey: entry.labelKey }));

  switch (instrument) {
    case 'piano':
      return pick(PIANO_VOICES);
    case 'guitar':
      return pick(GUITAR_VOICES);
    case 'violin':
      return pick(VIOLIN_VOICES);
    case 'drums':
      return pick(DRUM_KITS);
    case 'pads':
      // The custom bank needs user-loaded samples, so it isn't offered here.
      return pick(PAD_BANKS.filter((bank) => bank.id !== 'custom'));
  }
}

export function getTrackVoiceId(track: StudioTrack): string | undefined {
  const field = INSTRUMENT_VOICE_FIELD[track.instrument];
  return track[field];
}

export function defaultVoiceId(instrument: InstrumentId): string {
  return getInstrumentVoices(instrument)[0]?.id ?? '';
}

/** Builds the correctly-typed patch for changing a track's voice. */
export function voicePatch(
  instrument: InstrumentId,
  voiceId: string,
): Partial<Pick<StudioTrack, 'pianoVoiceId' | 'guitarVoiceId' | 'violinVoiceId' | 'drumKitId' | 'padBankId'>> {
  switch (instrument) {
    case 'piano':
      return { pianoVoiceId: voiceId };
    case 'guitar':
      return { guitarVoiceId: voiceId };
    case 'violin':
      return { violinVoiceId: voiceId };
    case 'drums':
      return { drumKitId: voiceId };
    case 'pads':
      return { padBankId: voiceId };
  }
}
