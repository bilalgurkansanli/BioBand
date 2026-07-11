import { PIANO_NOTES, type NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

export const MAX_USER_SONG_EVENTS = 800;
export const DEFAULT_PREVIEW_DURATION_MS = 5000;

const VALID_NOTE_IDS = new Set<string>(PIANO_NOTES.map((note) => note.id));

export type UserSongParseErrorCode =
  | 'invalidJson'
  | 'invalidSchema'
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
    if (!isValidNoteId(entry.noteId)) {
      throw new UserSongParseError('invalidSchema');
    }
    if (typeof entry.atMs !== 'number' || !Number.isFinite(entry.atMs) || entry.atMs < 0) {
      throw new UserSongParseError('invalidSchema');
    }
    events.push({ noteId: entry.noteId, atMs: Math.round(entry.atMs) });
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}

/**
 * Validates a BioBand song JSON document and returns a SongDefinition.
 * Accepts `{ title, artist?, events }` — id / previewDurationMs optional.
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
