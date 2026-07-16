import { parseGuitarSoundId } from '../guitarSounds';
import type { GuitarSongDefinition, GuitarSongDifficulty, GuitarSongEvent } from './types';

export const MAX_USER_GUITAR_EVENTS = 800;
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

export function isValidGuitarSoundId(value: unknown): value is string {
  return typeof value === 'string' && parseGuitarSoundId(value) !== null;
}

export function createUserGuitarSongId(): string {
  return `guitar-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseEvents(raw: unknown): GuitarSongEvent[] {
  if (!Array.isArray(raw)) {
    throw new UserGuitarSongParseError('invalidSchema');
  }
  if (raw.length === 0) {
    throw new UserGuitarSongParseError('emptySong');
  }
  if (raw.length > MAX_USER_GUITAR_EVENTS) {
    throw new UserGuitarSongParseError('tooManyNotes');
  }

  const events: GuitarSongEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      throw new UserGuitarSongParseError('invalidSchema');
    }
    const entry = item as Record<string, unknown>;

    let soundId: string | null = null;
    if (isValidGuitarSoundId(entry.soundId)) {
      soundId = entry.soundId;
    } else if (
      typeof entry.stringId === 'string' &&
      typeof entry.fret === 'number' &&
      Number.isFinite(entry.fret)
    ) {
      const candidate = `${entry.stringId}:f${Math.round(entry.fret)}`;
      if (isValidGuitarSoundId(candidate)) {
        soundId = candidate;
      }
    }

    if (!soundId) {
      throw new UserGuitarSongParseError('invalidSound');
    }
    if (typeof entry.atMs !== 'number' || !Number.isFinite(entry.atMs) || entry.atMs < 0) {
      throw new UserGuitarSongParseError('invalidSchema');
    }
    events.push({ soundId, atMs: Math.round(entry.atMs) });
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new UserGuitarSongParseError('invalidJson');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new UserGuitarSongParseError('invalidSchema');
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

  if (!('events' in doc) || !Array.isArray(doc.events)) {
    throw new UserGuitarSongParseError('invalidSchema');
  }

  const events = parseEvents(doc.events);
  const difficulty = parseDifficulty(doc.difficulty);

  const partialCount =
    typeof doc.partialCount === 'number' &&
    Number.isFinite(doc.partialCount) &&
    doc.partialCount > 0
      ? Math.min(Math.round(doc.partialCount), events.length)
      : Math.min(DEFAULT_PARTIAL_COUNT, events.length);

  return {
    id: createUserGuitarSongId(),
    title,
    artist,
    difficulty,
    events,
    partialCount,
  };
}

export function buildUserGuitarSongDefinition(input: {
  title: string;
  artist?: string;
  events: GuitarSongEvent[];
  difficulty?: GuitarSongDifficulty;
  partialCount?: number;
}): GuitarSongDefinition & { artist?: string } {
  if (input.events.length === 0) {
    throw new UserGuitarSongParseError('emptySong');
  }
  if (input.events.length > MAX_USER_GUITAR_EVENTS) {
    throw new UserGuitarSongParseError('tooManyNotes');
  }

  const events = [...input.events].sort((a, b) => a.atMs - b.atMs);
  const partialCount =
    input.partialCount && input.partialCount > 0
      ? Math.min(input.partialCount, events.length)
      : Math.min(DEFAULT_PARTIAL_COUNT, events.length);

  return {
    id: createUserGuitarSongId(),
    title: input.title.trim() || 'Untitled',
    artist: input.artist?.trim() || undefined,
    difficulty: input.difficulty ?? 'medium',
    events,
    partialCount,
  };
}
