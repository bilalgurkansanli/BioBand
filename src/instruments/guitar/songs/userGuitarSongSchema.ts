import {
  createUserSongId,
  finalizeEvents,
  parseJsonObject,
  readArtist,
  readAtMs,
  readEventArray,
  readPartialCount,
  readTitle,
  SongDocumentError,
} from '../../shared/userSongDocument';
import { formatChordSoundId, formatPluckSoundId, parseGuitarSoundId } from '../guitarSounds';
import type { GuitarSongDefinition, GuitarSongDifficulty, GuitarSongEvent } from './types';

export const DEFAULT_PARTIAL_COUNT = 12;

const DIFFICULTIES = new Set<GuitarSongDifficulty>(['easy', 'medium', 'hard']);

export type UserGuitarSongParseErrorCode =
  | 'invalidJson'
  | 'invalidSchema'
  | 'invalidSound'
  | 'emptySong'
  | 'tooManyNotes'
  | 'midiParseFailed'
  | 'readFailed'
  | 'unsupported';

export class UserGuitarSongParseError extends Error {
  readonly code: UserGuitarSongParseErrorCode;

  constructor(code: UserGuitarSongParseErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'UserGuitarSongParseError';
    this.code = code;
  }
}

/** Run a shared validation step, reporting its failure as this instrument's error. */
function asGuitarError<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof SongDocumentError) {
      throw new UserGuitarSongParseError(error.code);
    }
    throw error;
  }
}

/**
 * The scoring form of a sound id, or null when it is not one.
 *
 * The parser tolerates more than the fretboard emits — `s1` for an open
 * string, a fret past the neck (clamped), a chord in its recording form
 * (`chord:Em:arpeggio:up:swipe`). A chart that kept those spellings could never
 * be matched by a press, so every such note was a guaranteed miss.
 */
export function canonicalGuitarSoundId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = parseGuitarSoundId(value);
  if (!parsed) {
    return null;
  }
  return parsed.kind === 'chord'
    ? formatChordSoundId(parsed.chordId)
    : formatPluckSoundId(parsed.stringId, parsed.fret);
}

export function isValidGuitarSoundId(value: unknown): value is string {
  return canonicalGuitarSoundId(value) !== null;
}

export function createUserGuitarSongId(): string {
  return createUserSongId('guitar-user');
}

function parseEvents(doc: Record<string, unknown>): GuitarSongEvent[] {
  const raw = asGuitarError(() => readEventArray(doc));

  const events: GuitarSongEvent[] = [];
  for (const entry of raw) {
    let soundId = canonicalGuitarSoundId(entry.soundId);
    if (
      !soundId &&
      typeof entry.stringId === 'string' &&
      typeof entry.fret === 'number' &&
      Number.isFinite(entry.fret)
    ) {
      soundId = canonicalGuitarSoundId(`${entry.stringId}:f${Math.round(entry.fret)}`);
    }

    if (!soundId) {
      throw new UserGuitarSongParseError('invalidSound');
    }
    const atMs = readAtMs(entry.atMs);
    if (atMs === null) {
      throw new UserGuitarSongParseError('invalidSchema');
    }
    events.push({ soundId, atMs });
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}

function parseDifficulty(value: unknown): GuitarSongDifficulty {
  if (typeof value === 'string' && DIFFICULTIES.has(value as GuitarSongDifficulty)) {
    return value as GuitarSongDifficulty;
  }
  return 'medium';
}

/**
 * Validates a BioBand guitar JSON document.
 * Accepts `{ title, artist?, difficulty?, partialCount?, events }` with soundId + atMs
 * (soundId = `s3:f5` or `chord:Em`). Also accepts `{ stringId, fret, atMs }`.
 */
export function parseUserGuitarSongJson(
  text: string,
  options?: { fallbackTitle?: string },
): GuitarSongDefinition & { artist?: string } {
  const doc = asGuitarError(() => parseJsonObject(text));
  const events = parseEvents(doc);

  return {
    id: createUserGuitarSongId(),
    title: readTitle(doc.title, options?.fallbackTitle),
    artist: readArtist(doc.artist),
    difficulty: parseDifficulty(doc.difficulty),
    events,
    partialCount: readPartialCount(doc.partialCount, events.length, DEFAULT_PARTIAL_COUNT),
  };
}

export function buildUserGuitarSongDefinition(input: {
  title: string;
  artist?: string;
  events: GuitarSongEvent[];
  difficulty?: GuitarSongDifficulty;
  partialCount?: number;
}): GuitarSongDefinition & { artist?: string } {
  const events = asGuitarError(() => finalizeEvents(input.events));

  return {
    id: createUserGuitarSongId(),
    title: readTitle(input.title),
    artist: readArtist(input.artist),
    difficulty: input.difficulty ?? 'medium',
    events,
    partialCount: readPartialCount(input.partialCount, events.length, DEFAULT_PARTIAL_COUNT),
  };
}
