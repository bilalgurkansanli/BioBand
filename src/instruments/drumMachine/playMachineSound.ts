import { playHit } from '../drums/drumsEngine';
import type { DrumSoundId } from '../drums/drumsSounds';
import { pluckString } from '../guitar/guitarEngine';
import { triggerPad } from '../pads/padsEngine';
import type { PadSoundId } from '../pads/padsSounds';
import { playNote as playPianoNote } from '../piano/pianoEngine';
import type { NoteId } from '../piano/pianoNotes';
import { playViolinSoundId } from '../violin/violinEngine';
import type { DrumMachineTypeId } from './drumMachineBanks';

const DRUM_IDS = new Set<string>([
  'kick',
  'snare',
  'tomMid',
  'tomLow',
  'hihatClosed',
  'hihatOpen',
  'ride',
  'crash',
]);

export function playMachineSound(typeId: DrumMachineTypeId, playKey: string): void {
  switch (typeId) {
    case 'drums':
      if (DRUM_IDS.has(playKey)) {
        playHit(playKey as DrumSoundId);
      }
      return;
    case 'piano':
      playPianoNote(playKey as NoteId);
      return;
    case 'guitar': {
      const midiMatch = playKey.match(/^midi:(\d{1,3})$/);
      if (midiMatch) {
        pluckString('s6', Number(midiMatch[1]), { asMidi: true });
      }
      return;
    }
    case 'violin':
      playViolinSoundId(playKey);
      return;
    case 'pads':
      triggerPad(playKey as PadSoundId);
      return;
  }
}
