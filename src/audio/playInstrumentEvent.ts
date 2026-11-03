import { playHit } from '../instruments/drums/drumsEngine';
import { isDrumKitId, type DrumKitId } from '../instruments/drums/drumsKits';
import type { DrumSoundId } from '../instruments/drums/drumsSounds';
import { playGuitarSoundId } from '../instruments/guitar/guitarEngine';
import { isGuitarVoiceId, type GuitarVoiceId } from '../instruments/guitar/guitarVoices';
import { triggerPadForBank } from '../instruments/pads/padsEngine';
import { isPadBankId, type PadBankId } from '../instruments/pads/padsBanks';
import type { PadSoundId } from '../instruments/pads/padsSounds';
import { playNote as playPianoNote } from '../instruments/piano/pianoEngine';
import type { NoteId } from '../instruments/piano/pianoNotes';
import { isPianoVoiceId, type PianoVoiceId } from '../instruments/piano/pianoVoices';
import type { NotePerformance } from '../instruments/shared/songPerformance';
import { playViolinSoundId } from '../instruments/violin/violinEngine';
import { isViolinVoiceId, type ViolinVoiceId } from '../instruments/violin/violinVoices';
import type { InstrumentEvent, InstrumentId } from '../types/recording';

// Replaying a recorded event — a saved take or a Studio track — on the voice
// it was recorded with.
//
// Every engine takes the voice per note. Setting it globally instead (the old
// way) meant a Studio mix could only use one voice per instrument, and that
// playing a mix or a take quietly re-voiced the instrument the user was
// playing by hand — and so stamped the wrong voice on an overdub.

/** The kit / voice / bank a take or track was recorded with, resolved. */
export type EventVoice = {
  drumKitId: DrumKitId;
  guitarVoiceId: GuitarVoiceId;
  violinVoiceId: ViolinVoiceId;
  padBankId: PadBankId;
  pianoVoiceId: PianoVoiceId;
};

type StoredVoices = {
  drumKitId?: string;
  guitarVoiceId?: string;
  violinVoiceId?: string;
  padBankId?: string;
  pianoVoiceId?: string;
};

/**
 * The voices stored on a take or track, each falling back to its base voice
 * when absent (older takes) — except the piano's, whose fallback the caller
 * chooses, since saved-take playback has always used the current piano voice.
 */
export function resolveEventVoice(
  stored: StoredVoices,
  pianoFallback: PianoVoiceId = 'acoustic',
): EventVoice {
  return {
    drumKitId: isDrumKitId(stored.drumKitId) ? stored.drumKitId : 'acoustic',
    guitarVoiceId: isGuitarVoiceId(stored.guitarVoiceId) ? stored.guitarVoiceId : 'nylon',
    violinVoiceId: isViolinVoiceId(stored.violinVoiceId) ? stored.violinVoiceId : 'classic',
    padBankId: isPadBankId(stored.padBankId) ? stored.padBankId : 'drums',
    pianoVoiceId: isPianoVoiceId(stored.pianoVoiceId) ? stored.pianoVoiceId : pianoFallback,
  };
}

/**
 * Sound one recorded event at absolute audio-context time `atContextTime`.
 * `gainScale` is a Studio track's fader (1 for a saved take).
 */
export function playInstrumentEvent(
  instrument: InstrumentId,
  event: Pick<InstrumentEvent, 'soundId' | 'velocity' | 'transposeSemitones'>,
  voice: EventVoice,
  gainScale: number,
  atContextTime: number,
): void {
  // The onset goes to the engine as an absolute audio-context time, so the
  // audio thread owns it from here — a JS thread busy drawing cannot move it.
  const performance: NotePerformance = { atTime: atContextTime };
  const { soundId, velocity } = event;
  switch (instrument) {
    case 'piano':
      // Takes store written keys; the tone slider's shift travels per note.
      // Older takes have none and play untransposed — as they always exported.
      playPianoNote(
        soundId as NoteId,
        event.transposeSemitones ?? 0,
        voice.pianoVoiceId,
        gainScale,
        performance,
      );
      return;
    case 'drums':
      playHit(soundId as DrumSoundId, velocity, gainScale, performance, voice.drumKitId);
      return;
    case 'pads':
      triggerPadForBank(voice.padBankId, soundId as PadSoundId, velocity ?? 1, gainScale, performance);
      return;
    case 'guitar':
      playGuitarSoundId(soundId, velocity, gainScale, performance, voice.guitarVoiceId);
      return;
    case 'violin':
      playViolinSoundId(soundId, gainScale, performance, voice.violinVoiceId);
      return;
  }
}
