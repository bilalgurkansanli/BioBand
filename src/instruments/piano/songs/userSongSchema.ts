import { PIANO_NOTES, type NoteId } from '../pianoNotes';
import {
  chooseOctaveShift as chooseShiftForRange,
  foldIntoRange,
  MAX_PITCH_OCTAVE,
  MIN_PITCH_OCTAVE,
} from '../../shared/midiPitch';
import type { SongRole } from '../../shared/songPerformance';
import {
  createUserSongId as createPrefixedId,
  finalizeEvents,
  parseJsonObject,
  readArtist,
  readAtMs,
  readDurationMs,
  readEventArray,
  readTitle,
  readVelocity,
  SongDocumentError,
} from '../../shared/userSongDocument';
import type { SongDefinition, SongEvent, SongMeter } from './types';

export const DEFAULT_PREVIEW_DURATION_MS = 5000;

const MIDI_C4 = 60;
const MIDI_B5 = 83;

/** A beat outside this is a typo, not a tempo — the meter is then ignored. */
const MAX_METER_BEAT_MS = 10_000;
const MAX_METER_BEATS_PER_BAR = 32;

const VALID_NOTE_IDS = new Set<string>(PIANO_NOTES.map((note) => note.id));
const NOTE_ID_BY_MIDI = new Map<number, NoteId>(
  PIANO_NOTES.map((note) => [note.midi, note.id]),
);
const MIDI_BY_NOTE_ID = new Map<NoteId, number>(
  PIANO_NOTES.map((note) => [note.id, note.midi]),
);

/** Pitch class → semitone within octave (C = 0). */
const PITCH_CLASS: Record<string, number> = {
  C: 0,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

export type UserSongParseErrorCode =
  | 'invalidJson'
  | 'invalidSchema'
  | 'invalidNote'
  | 'emptySong'
  | 'tooManyNotes'
  | 'midiParseFailed'
  | 'readFailed'
  | 'fileTooLarge'
  | 'unsupported';

export class UserSongParseError extends Error {
  readonly code: UserSongParseErrorCode;

  constructor(code: UserSongParseErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'UserSongParseError';
    this.code = code;
  }
}

/** Run a shared validation step, reporting its failure as this instrument's error. */
function asPianoError<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof SongDocumentError) {
      throw new UserSongParseError(error.code);
    }
    throw error;
  }
}

export function isValidNoteId(value: unknown): value is NoteId {
  return typeof value === 'string' && VALID_NOTE_IDS.has(value);
}

/**
 * Pitch name (C4, Bb3, F#-less spelling) → MIDI number, without folding.
 *
 * The octave is bounded to the MIDI range (-1…9). An unbounded one
 * ("C99999999999999999999") used to parse to a number so large that folding it
 * onto the keyboard never terminated — reachable from both file import and the
 * paste box.
 */
export function parsePitchToMidi(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const match = /^([A-G]b?)(-?\d{1,3})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const pc = PITCH_CLASS[match[1]];
  const octave = Number(match[2]);
  if (
    pc === undefined ||
    !Number.isInteger(octave) ||
    octave < MIN_PITCH_OCTAVE ||
    octave > MAX_PITCH_OCTAVE
  ) {
    return null;
  }
  return (octave + 1) * 12 + pc;
}

/**
 * One octave shift for a whole set of pitches — the one leaving the fewest
 * outside the keyboard, breaking ties toward the range's centre.
 */
export function chooseOctaveShift(midiNumbers: number[]): number {
  return chooseShiftForRange(midiNumbers, MIDI_C4, MIDI_B5);
}

/**
 * Land a MIDI number on the keyboard, folding only what the shift missed.
 * Constant time and total: non-finite input lands on C4 instead of hanging.
 */
export function fitMidiToKeyboard(midiNumber: number): NoteId {
  const folded = foldIntoRange(midiNumber, MIDI_C4, MIDI_B5);
  return (folded !== null ? NOTE_ID_BY_MIDI.get(folded) : undefined) ?? 'C4';
}

/**
 * Optional `{ beatMs, beatsPerBar }` on an imported document. Stating the beat
 * is what lets a chart be accented like a built-in song instead of every note
 * landing at the same weight; a bad value is ignored rather than rejected, so
 * one typo cannot cost the user the whole import.
 */
function parseMeter(raw: unknown): SongMeter | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const entry = raw as Record<string, unknown>;
  const beatMs = entry.beatMs;
  if (
    typeof beatMs !== 'number' ||
    !Number.isFinite(beatMs) ||
    beatMs <= 0 ||
    beatMs > MAX_METER_BEAT_MS
  ) {
    return undefined;
  }
  const beatsPerBar =
    typeof entry.beatsPerBar === 'number' &&
    Number.isFinite(entry.beatsPerBar) &&
    entry.beatsPerBar >= 1 &&
    entry.beatsPerBar <= MAX_METER_BEATS_PER_BAR
      ? Math.round(entry.beatsPerBar)
      : undefined;

  return {
    beatMs,
    ...(beatsPerBar !== undefined ? { beatsPerBar } : {}),
  };
}

export function createUserSongId(): string {
  return createPrefixedId('user');
}

function parseEvents(doc: Record<string, unknown>): SongEvent[] {
  const raw = asPianoError(() => readEventArray(doc));

  type Parsed = {
    midi: number;
    atMs: number;
    durationMs?: number;
    velocity?: number;
    role?: SongRole;
  };

  const parsed: Parsed[] = [];
  for (const entry of raw) {
    // A pitch already on the keyboard resolves directly; anything else is
    // read as a MIDI number so the whole piece can be shifted as one.
    const midi = isValidNoteId(entry.noteId)
      ? MIDI_BY_NOTE_ID.get(entry.noteId)
      : (parsePitchToMidi(entry.noteId) ?? undefined);
    if (midi === undefined) {
      throw new UserSongParseError('invalidNote');
    }
    const atMs = readAtMs(entry.atMs);
    if (atMs === null) {
      throw new UserSongParseError('invalidSchema');
    }

    const durationMs = readDurationMs(entry.durationMs);
    const velocity = readVelocity(entry.velocity);
    const role = entry.role === 'accompaniment' ? ('accompaniment' as const) : undefined;

    parsed.push({ midi, atMs, durationMs, velocity, role });
  }

  const shift = chooseOctaveShift(
    parsed.filter((entry) => entry.role !== 'accompaniment').map((entry) => entry.midi),
  );

  const events: SongEvent[] = parsed.map((entry) => ({
    noteId: fitMidiToKeyboard(entry.midi + shift),
    atMs: entry.atMs,
    ...(entry.durationMs !== undefined ? { durationMs: entry.durationMs } : {}),
    ...(entry.velocity !== undefined ? { velocity: entry.velocity } : {}),
    ...(entry.role !== undefined ? { role: entry.role } : {}),
  }));

  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}

/**
 * Validates a BioBand song JSON document and returns a SongDefinition.
 * Accepts `{ title, artist?, events }` — id / previewDurationMs optional.
 * Out-of-range noteIds (e.g. C6) are octave-shifted into C4–B5.
 */
export function parseUserSongJson(
  text: string,
  options?: { fallbackTitle?: string },
): SongDefinition {
  const doc = asPianoError(() => parseJsonObject(text));
  const title = readTitle(doc.title, options?.fallbackTitle);
  const artist = readArtist(doc.artist);

  const events = parseEvents(doc);
  const meter = parseMeter(doc.meter);
  const lastAtMs = events.length > 0 ? events[events.length - 1].atMs : 0;

  const previewDurationMs =
    typeof doc.previewDurationMs === 'number' &&
    Number.isFinite(doc.previewDurationMs) &&
    doc.previewDurationMs > 0
      ? Math.min(DEFAULT_PREVIEW_DURATION_MS * 6, Math.round(doc.previewDurationMs))
      : // Preview the opening rather than a fixed five seconds, and never run
        // past the end of a short piece.
        Math.max(
          2000,
          Math.min(DEFAULT_PREVIEW_DURATION_MS * 2, lastAtMs + (meter?.beatMs ?? 500)),
        );

  return {
    id: createUserSongId(),
    title,
    artist,
    previewDurationMs,
    events,
    ...(meter ? { meter } : {}),
  };
}

/** Finalize events produced by MIDI (or other) converters into a SongDefinition. */
export function buildUserSongDefinition(input: {
  title: string;
  artist?: string;
  events: SongEvent[];
  previewDurationMs?: number;
  /** Where the beat falls, so an imported chart gets accents like a built-in one. */
  meter?: SongMeter;
}): SongDefinition {
  const events = asPianoError(() => finalizeEvents(input.events));

  return {
    id: createUserSongId(),
    title: readTitle(input.title),
    artist: readArtist(input.artist),
    previewDurationMs: input.previewDurationMs ?? DEFAULT_PREVIEW_DURATION_MS,
    events,
    ...(input.meter ? { meter: input.meter } : {}),
  };
}
