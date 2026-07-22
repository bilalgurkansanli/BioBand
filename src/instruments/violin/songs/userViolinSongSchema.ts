import { formatNoteSoundId, parseViolinSoundId, type ViolinStringId } from '../violinSounds';
import type { ViolinSongDefinition, ViolinSongDifficulty, ViolinSongEvent } from './types';

export const MAX_USER_VIOLIN_EVENTS = 800;
export const DEFAULT_PARTIAL_COUNT = 12;

const DIFFICULTIES = new Set<ViolinSongDifficulty>(['easy', 'medium', 'hard']);
const STRING_IDS = new Set<ViolinStringId>(['v1', 'v2', 'v3', 'v4']);

export type UserViolinSongParseErrorCode =
  | 'invalidJson'
  | 'invalidSchema'
  | 'invalidSound'
  | 'emptySong'
  | 'tooManyNotes'
  | 'readFailed'
  | 'unsupported';

export class UserViolinSongParseError extends Error {
  readonly code: UserViolinSongParseErrorCode;

  constructor(code: UserViolinSongParseErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'UserViolinSongParseError';
    this.code = code;
  }
}

export function isValidViolinSoundId(value: unknown): value is string {
  return typeof value === 'string' && parseViolinSoundId(value) !== null;
}

export function createUserViolinSongId(): string {
  return `violin-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseEvents(raw: unknown): ViolinSongEvent[] {
  if (!Array.isArray(raw)) {
    throw new UserViolinSongParseError('invalidSchema');
  }
  if (raw.length === 0) {
    throw new UserViolinSongParseError('emptySong');
  }
  if (raw.length > MAX_USER_VIOLIN_EVENTS) {
    throw new UserViolinSongParseError('tooManyNotes');
  }

  const events: ViolinSongEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      throw new UserViolinSongParseError('invalidSchema');
    }
    const entry = item as Record<string, unknown>;

    let soundId: string | null = null;
    if (isValidViolinSoundId(entry.soundId)) {
      soundId = entry.soundId;
    } else if (
      typeof entry.stringId === 'string' &&
      STRING_IDS.has(entry.stringId as ViolinStringId) &&
      typeof entry.position === 'number' &&
      Number.isFinite(entry.position)
    ) {
      const candidate = formatNoteSoundId(entry.stringId as ViolinStringId, entry.position);
      if (isValidViolinSoundId(candidate)) {
        soundId = candidate;
      }
    }

    if (!soundId) {
      throw new UserViolinSongParseError('invalidSound');
    }
    if (typeof entry.atMs !== 'number' || !Number.isFinite(entry.atMs) || entry.atMs < 0) {
      throw new UserViolinSongParseError('invalidSchema');
    }
    events.push({ soundId, atMs: Math.round(entry.atMs) });
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}

function parseDifficulty(value: unknown): ViolinSongDifficulty {
  if (typeof value === 'string' && DIFFICULTIES.has(value as ViolinSongDifficulty)) {
    return value as ViolinSongDifficulty;
  }
  return 'medium';
}

/**
 * Validates a BioBand violin JSON document.
 * Accepts `{ title, artist?, difficulty?, partialCount?, events }` with soundId + atMs
 * (soundId = `v2:3` or `phrase:id`). Also accepts `{ stringId, position, atMs }`.
 */
export function parseUserViolinSongJson(
  text: string,
  options?: { fallbackTitle?: string },
): ViolinSongDefinition & { artist?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new UserViolinSongParseError('invalidJson');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new UserViolinSongParseError('invalidSchema');
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
    throw new UserViolinSongParseError('invalidSchema');
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
    id: createUserViolinSongId(),
    title,
    artist,
    difficulty,
    events,
    partialCount,
  };
}
