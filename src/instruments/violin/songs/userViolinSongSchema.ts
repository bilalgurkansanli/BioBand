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
import { formatNoteSoundId, parseViolinSoundId, type ViolinStringId } from '../violinSounds';
import type { ViolinSongDefinition, ViolinSongDifficulty, ViolinSongEvent } from './types';

export const DEFAULT_PARTIAL_COUNT = 12;

const DIFFICULTIES = new Set<ViolinSongDifficulty>(['easy', 'medium', 'hard']);
const STRING_IDS = new Set<ViolinStringId>(['v1', 'v2', 'v3', 'v4']);

export type UserViolinSongParseErrorCode =
  | 'invalidJson'
  | 'invalidSchema'
  | 'invalidSound'
  | 'emptySong'
  | 'tooManyNotes'
  | 'midiParseFailed'
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

/** Run a shared validation step, reporting its failure as this instrument's error. */
function asViolinError<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof SongDocumentError) {
      throw new UserViolinSongParseError(error.code);
    }
    throw error;
  }
}

/**
 * The scoring form of a sound id, or null when it is not one. The parser
 * clamps a position past the fingerboard (`v1:42` → `v1:9`), but a chart that
 * kept the raw spelling could never be matched by a press.
 */
export function canonicalViolinSoundId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = parseViolinSoundId(value);
  if (!parsed) {
    return null;
  }
  return parsed.kind === 'phrase'
    ? `phrase:${parsed.phraseId}`
    : formatNoteSoundId(parsed.stringId, parsed.position);
}

export function isValidViolinSoundId(value: unknown): value is string {
  return canonicalViolinSoundId(value) !== null;
}

export function createUserViolinSongId(): string {
  return createUserSongId('violin-user');
}

function parseEvents(doc: Record<string, unknown>): ViolinSongEvent[] {
  const raw = asViolinError(() => readEventArray(doc));

  const events: ViolinSongEvent[] = [];
  for (const entry of raw) {
    let soundId = canonicalViolinSoundId(entry.soundId);
    if (
      !soundId &&
      typeof entry.stringId === 'string' &&
      STRING_IDS.has(entry.stringId as ViolinStringId) &&
      typeof entry.position === 'number' &&
      Number.isFinite(entry.position)
    ) {
      soundId = canonicalViolinSoundId(
        formatNoteSoundId(entry.stringId as ViolinStringId, entry.position),
      );
    }

    if (!soundId) {
      throw new UserViolinSongParseError('invalidSound');
    }
    const atMs = readAtMs(entry.atMs);
    if (atMs === null) {
      throw new UserViolinSongParseError('invalidSchema');
    }
    events.push({ soundId, atMs });
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
  const doc = asViolinError(() => parseJsonObject(text));
  const events = parseEvents(doc);

  return {
    id: createUserViolinSongId(),
    title: readTitle(doc.title, options?.fallbackTitle),
    artist: readArtist(doc.artist),
    difficulty: parseDifficulty(doc.difficulty),
    events,
    partialCount: readPartialCount(doc.partialCount, events.length, DEFAULT_PARTIAL_COUNT),
  };
}

export function buildUserViolinSongDefinition(input: {
  title: string;
  artist?: string;
  events: ViolinSongEvent[];
  difficulty?: ViolinSongDifficulty;
  partialCount?: number;
}): ViolinSongDefinition & { artist?: string } {
  const events = asViolinError(() => finalizeEvents(input.events));

  return {
    id: createUserViolinSongId(),
    title: readTitle(input.title),
    artist: readArtist(input.artist),
    difficulty: input.difficulty ?? 'medium',
    events,
    partialCount: readPartialCount(input.partialCount, events.length, DEFAULT_PARTIAL_COUNT),
  };
}
