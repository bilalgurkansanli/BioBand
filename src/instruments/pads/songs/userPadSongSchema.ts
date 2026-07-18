import { PAD_SOUND_IDS, type PadSoundId } from '../padsSounds';
import type { PadSongDefinition, PadSongDifficulty, PadSongEvent } from './types';

export const MAX_USER_PAD_EVENTS = 800;
export const DEFAULT_PARTIAL_COUNT = 12;

const VALID_PAD_IDS = new Set<string>(PAD_SOUND_IDS);
const DIFFICULTIES = new Set<PadSongDifficulty>(['easy', 'medium', 'hard']);

export type UserPadSongParseErrorCode =
  | 'invalidJson'
  | 'invalidSchema'
  | 'invalidPad'
  | 'emptySong'
  | 'tooManyNotes'
  | 'midiParseFailed'
  | 'readFailed'
  | 'unsupported';

export class UserPadSongParseError extends Error {
  readonly code: UserPadSongParseErrorCode;

  constructor(code: UserPadSongParseErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'UserPadSongParseError';
    this.code = code;
  }
}

export function isValidPadId(value: unknown): value is PadSoundId {
  return typeof value === 'string' && VALID_PAD_IDS.has(value);
}

export function createUserPadSongId(): string {
  return `pad-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseEvents(raw: unknown): PadSongEvent[] {
  if (!Array.isArray(raw)) {
    throw new UserPadSongParseError('invalidSchema');
  }
  if (raw.length === 0) {
    throw new UserPadSongParseError('emptySong');
  }
  if (raw.length > MAX_USER_PAD_EVENTS) {
    throw new UserPadSongParseError('tooManyNotes');
  }

  const events: PadSongEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      throw new UserPadSongParseError('invalidSchema');
    }
    const entry = item as Record<string, unknown>;
    if (!isValidPadId(entry.padId)) {
      throw new UserPadSongParseError('invalidPad');
    }
    if (typeof entry.atMs !== 'number' || !Number.isFinite(entry.atMs) || entry.atMs < 0) {
      throw new UserPadSongParseError('invalidSchema');
    }
    events.push({ padId: entry.padId, atMs: Math.round(entry.atMs) });
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}

function parseDifficulty(value: unknown): PadSongDifficulty {
  if (typeof value === 'string' && DIFFICULTIES.has(value as PadSongDifficulty)) {
    return value as PadSongDifficulty;
  }
  return 'medium';
}

/**
 * Validates a BioBand pads JSON document.
 * Accepts `{ title, artist?, difficulty?, partialCount?, events }` with padId + atMs.
 */
export function parseUserPadSongJson(
  text: string,
  options?: { fallbackTitle?: string },
): PadSongDefinition & { artist?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new UserPadSongParseError('invalidJson');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new UserPadSongParseError('invalidSchema');
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
    throw new UserPadSongParseError('invalidSchema');
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
    id: createUserPadSongId(),
    title,
    artist,
    difficulty,
    events,
    partialCount,
  };
}

export function buildUserPadSongDefinition(input: {
  title: string;
  artist?: string;
  events: PadSongEvent[];
  difficulty?: PadSongDifficulty;
  partialCount?: number;
}): PadSongDefinition & { artist?: string } {
  if (input.events.length === 0) {
    throw new UserPadSongParseError('emptySong');
  }
  if (input.events.length > MAX_USER_PAD_EVENTS) {
    throw new UserPadSongParseError('tooManyNotes');
  }

  const events = [...input.events].sort((a, b) => a.atMs - b.atMs);
  const partialCount =
    input.partialCount && input.partialCount > 0
      ? Math.min(input.partialCount, events.length)
      : Math.min(DEFAULT_PARTIAL_COUNT, events.length);

  return {
    id: createUserPadSongId(),
    title: input.title.trim() || 'Untitled',
    artist: input.artist?.trim() || undefined,
    difficulty: input.difficulty ?? 'medium',
    events,
    partialCount,
  };
}
