import { PIANO_NOTES, type NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

export const MAX_USER_SONG_EVENTS = 800;
export const DEFAULT_PREVIEW_DURATION_MS = 5000;

const MIDI_C4 = 60;
const MIDI_B5 = 83;

const VALID_NOTE_IDS = new Set<string>(PIANO_NOTES.map((note) => note.id));
const NOTE_ID_BY_MIDI = new Map<number, NoteId>(
  PIANO_NOTES.map((note) => [note.midi, note.id]),
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
  | 'unsupported';

export class UserSongParseError extends Error {
  readonly code: UserSongParseErrorCode;

  constructor(code: UserSongParseErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'UserSongParseError';
    this.code = code;
  }
}

export function isValidNoteId(value: unknown): value is NoteId {
  return typeof value === 'string' && VALID_NOTE_IDS.has(value);
}

/**
 * Map a note id (e.g. C6, Bb3) onto the playable C4–B5 keyboard by
 * shifting octaves. Returns null if the string is not a known pitch.
 */
export function resolveNoteIdToKeyboard(value: unknown): NoteId | null {
  if (typeof value !== 'string') {
    return null;
  }
  if (isValidNoteId(value)) {
    return value;
  }

  const match = /^([A-G]b?)(-?\d+)$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const pitch = match[1];
  const octave = Number(match[2]);
  const pc = PITCH_CLASS[pitch];
  if (pc === undefined || !Number.isFinite(octave)) {
    return null;
  }

  let midi = (octave + 1) * 12 + pc;
  while (midi < MIDI_C4) {
    midi += 12;
  }
  while (midi > MIDI_B5) {
    midi -= 12;
  }

  return NOTE_ID_BY_MIDI.get(midi) ?? null;
}

export function createUserSongId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseEvents(raw: unknown): SongEvent[] {
  if (!Array.isArray(raw)) {
    throw new UserSongParseError('invalidSchema');
  }
  if (raw.length === 0) {
    throw new UserSongParseError('emptySong');
  }
  if (raw.length > MAX_USER_SONG_EVENTS) {
    throw new UserSongParseError('tooManyNotes');
  }

  const events: SongEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      throw new UserSongParseError('invalidSchema');
    }
    const entry = item as Record<string, unknown>;
    const noteId = resolveNoteIdToKeyboard(entry.noteId);
    if (!noteId) {
      throw new UserSongParseError('invalidNote');
    }
    if (typeof entry.atMs !== 'number' || !Number.isFinite(entry.atMs) || entry.atMs < 0) {
      throw new UserSongParseError('invalidSchema');
    }
    events.push({ noteId, atMs: Math.round(entry.atMs) });
  }

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
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new UserSongParseError('invalidJson');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new UserSongParseError('invalidSchema');
  }

  const doc = parsed as Record<string, unknown>;
  const title =
    typeof doc.title === 'string' && doc.title.trim().length > 0
      ? doc.title.trim()
      : options?.fallbackTitle?.trim() || 'Untitled';

  const artist =
    typeof doc.artist === 'string' && doc.artist.trim().length > 0
      ? doc.artist.trim()
      : undefined;

  const previewDurationMs =
    typeof doc.previewDurationMs === 'number' &&
    Number.isFinite(doc.previewDurationMs) &&
    doc.previewDurationMs > 0
      ? Math.round(doc.previewDurationMs)
      : DEFAULT_PREVIEW_DURATION_MS;

  if (!('events' in doc) || !Array.isArray(doc.events)) {
    throw new UserSongParseError('invalidSchema');
  }

  const events = parseEvents(doc.events);

  return {
    id: createUserSongId(),
    title,
    artist,
    previewDurationMs,
    events,
  };
}

/** Finalize events produced by MIDI (or other) converters into a SongDefinition. */
export function buildUserSongDefinition(input: {
  title: string;
  artist?: string;
  events: SongEvent[];
  previewDurationMs?: number;
}): SongDefinition {
  if (input.events.length === 0) {
    throw new UserSongParseError('emptySong');
  }
  if (input.events.length > MAX_USER_SONG_EVENTS) {
    throw new UserSongParseError('tooManyNotes');
  }

  const events = [...input.events].sort((a, b) => a.atMs - b.atMs);

  return {
    id: createUserSongId(),
    title: input.title.trim() || 'Untitled',
    artist: input.artist?.trim() || undefined,
    previewDurationMs: input.previewDurationMs ?? DEFAULT_PREVIEW_DURATION_MS,
    events,
  };
}
