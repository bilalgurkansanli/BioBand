import { VIOLIN_STRINGS, type ViolinStringId } from './violinSounds';

export const POSITION_COUNT = 10;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function getMidi(stringId: ViolinStringId, position: number): number {
  const openMidi = VIOLIN_STRINGS.find((s) => s.id === stringId)?.openMidi ?? 69;
  const clamped = Math.max(0, Math.min(POSITION_COUNT - 1, position));
  return openMidi + clamped;
}

export function getNoteLabel(stringId: ViolinStringId, position: number): string {
  const midi = getMidi(stringId, position);
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}
