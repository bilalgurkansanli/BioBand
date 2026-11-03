import { playHit } from '../drums/drumsEngine';
import type { DrumSoundId } from '../drums/drumsSounds';
import { pluckString } from '../guitar/guitarEngine';
import { triggerPad } from '../pads/padsEngine';
import type { PadSoundId } from '../pads/padsSounds';
import { playNote as playPianoNote } from '../piano/pianoEngine';
import type { NoteId } from '../piano/pianoNotes';
import type { NotePerformance } from '../shared/songPerformance';
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

/**
 * Sound one sequencer cell. `atTime` is the audio-clock time the step sounds
 * at (the step clock queues steps ahead of time); omit it for an immediate
 * preview tap.
 */
export function playMachineSound(
  typeId: DrumMachineTypeId,
  playKey: string,
  velocity: number = 1,
  atTime?: number,
): void {
  const performance: NotePerformance | undefined =
    atTime === undefined ? undefined : { atTime };
  switch (typeId) {
    case 'drums':
      if (DRUM_IDS.has(playKey)) {
        playHit(playKey as DrumSoundId, velocity, 1, performance);
      }
      return;
    case 'piano':
      // Piano/violin engines have no velocity input — accents still persist
      // in saved takes for the engines that do.
      playPianoNote(playKey as NoteId, undefined, undefined, 1, performance);
      return;
    case 'guitar': {
      const midiMatch = playKey.match(/^midi:(\d{1,3})$/);
      if (midiMatch) {
        pluckString('s6', Number(midiMatch[1]), { asMidi: true, velocity, performance });
      }
      return;
    }
    case 'violin':
      playViolinSoundId(playKey, 1, performance);
      return;
    case 'pads':
      triggerPad(playKey as PadSoundId, velocity, performance);
      return;
  }
}
