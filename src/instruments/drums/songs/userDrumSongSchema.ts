import { DRUM_PADS, type DrumSoundId } from '../drumsSounds';
import type { DrumSongDefinition, DrumSongDifficulty, DrumSongEvent } from './types';

export const MAX_USER_DRUM_EVENTS = 800;
export const DEFAULT_PARTIAL_COUNT = 12;

const VALID_PAD_IDS = new Set<string>(DRUM_PADS.map((pad) => pad.id));
const DIFFICULTIES = new Set<DrumSongDifficulty>(['easy', 'medium', 'hard']);

export type UserDrumSongParseErrorCode =
  | 'invalidJson'
  | 'invalidSchema'
  | 'invalidPad'
  | 'emptySong'
  | 'tooManyNotes'
  | 'midiParseFailed'
  | 'readFailed'
  | 'unsupported';

export class UserDrumSongParseError extends Error {
  readonly code: UserDrumSongParseErrorCode;

  constructor(code: UserDrumSongParseErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'UserDrumSongParseError';
    this.code = code;
  }
}

export function isValidPadId(value: unknown): value is DrumSoundId {
  return typeof value === 'string' && VALID_PAD_IDS.has(value);
}

export function createUserDrumSongId(): string {
  return `drum-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseEvents(raw: unknown): DrumSongEvent[] {
  if (!Array.isArray(raw)) {
    throw new UserDrumSongParseError('invalidSchema');
  }
  if (raw.length === 0) {
    throw new UserDrumSongParseError('emptySong');
  }
  if (raw.length > MAX_USER_DRUM_EVENTS) {
    throw new UserDrumSongParseError('tooManyNotes');
  }

  const events: DrumSongEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      throw new UserDrumSongParseError('invalidSchema');
    }
    const entry = item as Record<string, unknown>;
    if (!isValidPadId(entry.padId)) {
      throw new UserDrumSongParseError('invalidPad');
    }
    if (typeof entry.atMs !== 'number' || !Number.isFinite(entry.atMs) || entry.atMs < 0) {
      throw new UserDrumSongParseError('invalidSchema');
    }
    events.push({ padId: entry.padId, atMs: Math.round(entry.atMs) });
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}

function parseDifficulty(value: unknown): DrumSongDifficulty {
  if (typeof value === 'string' && DIFFICULTIES.has(value as DrumSongDifficulty)) {
    return value as DrumSongDifficulty;
  }
  return 'medium';
}

/**
 * Validates a BioBand drums JSON document.
 * Accepts `{ title, artist?, difficulty?, partialCount?, events }` with padId + atMs.
 */
export function parseUserDrumSongJson(
  text: string,
  options?: { fallbackTitle?: string },
): DrumSongDefinition & { artist?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new UserDrumSongParseError('invalidJson');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new UserDrumSongParseError('invalidSchema');
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
    throw new UserDrumSongParseError('invalidSchema');
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
    id: createUserDrumSongId(),
    title,
    artist,
    difficulty,
    events,
    partialCount,
  };
}

export function buildUserDrumSongDefinition(input: {
  title: string;
  artist?: string;
  events: DrumSongEvent[];
  difficulty?: DrumSongDifficulty;
  partialCount?: number;
}): DrumSongDefinition & { artist?: string } {
  if (input.events.length === 0) {
    throw new UserDrumSongParseError('emptySong');
  }
  if (input.events.length > MAX_USER_DRUM_EVENTS) {
    throw new UserDrumSongParseError('tooManyNotes');
  }

  const events = [...input.events].sort((a, b) => a.atMs - b.atMs);
  const partialCount =
    input.partialCount && input.partialCount > 0
      ? Math.min(input.partialCount, events.length)
      : Math.min(DEFAULT_PARTIAL_COUNT, events.length);

  return {
    id: createUserDrumSongId(),
    title: input.title.trim() || 'Untitled',
    artist: input.artist?.trim() || undefined,
    difficulty: input.difficulty ?? 'medium',
    events,
    partialCount,
  };
}
