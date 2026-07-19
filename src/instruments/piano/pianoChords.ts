// One-finger chords: expand a single pressed key into a full triad. Notes that
// fall outside the 2-octave keyboard range are simply dropped, so chords near
// the very top of the board may sound as a partial (root + third).

import { PIANO_NOTES, type NoteId } from './pianoNotes';
import { PIANO_SCALE_OPTIONS, type PianoScaleId } from './pianoScales';
import type { PianoChordMode } from '../../storage/pianoSettingsStorage';

const ID_TO_MIDI = new Map<NoteId, number>(
  PIANO_NOTES.map((note) => [note.id, note.midi]),
);
const MIDI_TO_ID = new Map<number, NoteId>(
  PIANO_NOTES.map((note) => [note.midi, note.id]),
);

function idFromMidi(midi: number): NoteId | null {
  return MIDI_TO_ID.get(midi) ?? null;
}

function majorTriad(rootMidi: number): number[] {
  return [rootMidi, rootMidi + 4, rootMidi + 7];
}

function minorTriad(rootMidi: number): number[] {
  return [rootMidi, rootMidi + 3, rootMidi + 7];
}

/** Diatonic triad (root / third / fifth) built from the scale's own steps. */
function scaleTriad(rootMidi: number, scaleId: PianoScaleId): number[] {
  const option = PIANO_SCALE_OPTIONS.find((s) => s.id === scaleId);
  if (!option) {
    return majorTriad(rootMidi);
  }
  const allowed = new Set(option.pitchClasses);
  // Walk up chromatically collecting the scale tones from the root.
  const tones: number[] = [];
  for (let m = rootMidi; m <= rootMidi + 24 && tones.length < 5; m++) {
    if (allowed.has(((m % 12) + 12) % 12)) {
      tones.push(m);
    }
  }
  if (tones.length < 5) {
    return majorTriad(rootMidi);
  }
  return [tones[0], tones[2], tones[4]];
}

/**
 * Expand a pressed key into the notes that should actually sound, given the
 * chord mode. Returns at least the base note. `scaleId` is only used by 'auto'.
 */
export function buildChord(
  baseId: NoteId,
  mode: PianoChordMode,
  scaleId: PianoScaleId | null,
): NoteId[] {
  if (mode === 'off') {
    return [baseId];
  }
  const baseMidi = ID_TO_MIDI.get(baseId);
  if (baseMidi === undefined) {
    return [baseId];
  }

  let midis: number[];
  if (mode === 'major') {
    midis = majorTriad(baseMidi);
  } else if (mode === 'minor') {
    midis = minorTriad(baseMidi);
  } else {
    midis = scaleId ? scaleTriad(baseMidi, scaleId) : majorTriad(baseMidi);
  }

  const ids = midis
    .map(idFromMidi)
    .filter((id): id is NoteId => id !== null);
  return ids.length > 0 ? ids : [baseId];
}
