import type { ChordDefinition } from './guitarChords';
import { getChordStringNotes } from './guitarChords';
import type { GuitarStringId } from './guitarSounds';

export type GuitarChordPlayMode = 'strum' | 'arpeggio' | 'rasgueado';

export type GuitarChordGesture = 'tap' | 'swipe';

export type ChordPatternStep = {
  stringId: GuitarStringId;
  midi: number;
  atMs: number;
  velocity: number;
};

const STRUM_STAGGER_MS = 22;
const ARP_STAGGER_MS = 95;
const RASC_STAGGER_MS = 11;

export const GUITAR_CHORD_PLAY_MODES: GuitarChordPlayMode[] = [
  'strum',
  'arpeggio',
  'rasgueado',
];

export function isGuitarChordPlayMode(value: string): value is GuitarChordPlayMode {
  return (GUITAR_CHORD_PLAY_MODES as string[]).includes(value);
}

/** Keep only valid modes, catalog order, never empty. */
export function normalizeVisiblePlayModes(
  ids: readonly string[],
): GuitarChordPlayMode[] {
  const allowed = new Set(ids.filter(isGuitarChordPlayMode));
  const ordered = GUITAR_CHORD_PLAY_MODES.filter((id) => allowed.has(id));
  return ordered.length > 0 ? ordered : [...GUITAR_CHORD_PLAY_MODES];
}

type Note = { stringId: GuitarStringId; midi: number };

function orderedNotes(chord: ChordDefinition, direction: 'down' | 'up'): Note[] {
  const notes = getChordStringNotes(chord);
  return direction === 'up' ? [...notes].reverse() : notes;
}

function stepsFromNotes(
  notes: Note[],
  staggerMs: number,
  velocityForIndex: (index: number, total: number) => number,
): ChordPatternStep[] {
  return notes.map((note, index) => ({
    stringId: note.stringId,
    midi: note.midi,
    atMs: Math.round(index * staggerMs),
    velocity: velocityForIndex(index, notes.length),
  }));
}

/** Down → up → down across sounding strings (tap arpeggio). */
function buildDownUpDown(notes: Note[]): Note[] {
  if (notes.length <= 1) {
    return notes;
  }
  const ascending = notes;
  const descending = [...notes].reverse().slice(1);
  const ascendingAgain = notes.slice(1);
  return [...ascending, ...descending, ...ascendingAgain];
}

/**
 * Build timed plucks for the armed chord.
 * - strum: tight cascade (pick)
 * - arpeggio: fingerstyle sequence; tap = down-up-down, swipe = one way
 * - rasgueado: fast flamenco-style fan
 */
export function buildChordPatternSteps(
  chord: ChordDefinition,
  mode: GuitarChordPlayMode,
  direction: 'down' | 'up',
  gesture: GuitarChordGesture,
  /** Settings "strum feel" — scales only the strum cascade stagger. */
  strumStaggerScale = 1,
): ChordPatternStep[] {
  if (mode === 'strum') {
    const notes = orderedNotes(chord, direction);
    const stagger =
      (direction === 'up' ? STRUM_STAGGER_MS - 4 : STRUM_STAGGER_MS) *
      strumStaggerScale;
    const baseVel = direction === 'down' ? 0.88 : 0.58;
    return stepsFromNotes(notes, stagger, () => baseVel);
  }

  if (mode === 'rasgueado') {
    const notes = orderedNotes(chord, direction);
    return stepsFromNotes(notes, RASC_STAGGER_MS, (index, total) => {
      // Accent the start of the fan, slight decay.
      const t = total <= 1 ? 0 : index / (total - 1);
      return direction === 'down' ? 0.95 - t * 0.25 : 0.7 + t * 0.15;
    });
  }

  // arpeggio
  const forward = orderedNotes(chord, direction);
  if (gesture === 'tap') {
    // Always musical down-up-down from bass→treble perspective.
    const bassFirst = orderedNotes(chord, 'down');
    const sequence = buildDownUpDown(bassFirst);
    return stepsFromNotes(sequence, ARP_STAGGER_MS, (index, total) => {
      const t = total <= 1 ? 0.5 : index / (total - 1);
      return 0.55 + (1 - Math.abs(t - 0.5) * 2) * 0.25;
    });
  }

  return stepsFromNotes(forward, ARP_STAGGER_MS, (index, total) => {
    const t = total <= 1 ? 0 : index / (total - 1);
    return direction === 'down' ? 0.55 + t * 0.3 : 0.75 - t * 0.25;
  });
}
