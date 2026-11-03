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
import { PAD_SOUND_IDS, type PadSoundId } from '../padsSounds';
import type { PadSongDefinition, PadSongDifficulty, PadSongEvent } from './types';

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
  | 'fileTooLarge'
  | 'unsupported';

export class UserPadSongParseError extends Error {
  readonly code: UserPadSongParseErrorCode;

  constructor(code: UserPadSongParseErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'UserPadSongParseError';
    this.code = code;
  }
}

/** Run a shared validation step, reporting its failure as this instrument's error. */
function asPadError<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof SongDocumentError) {
      throw new UserPadSongParseError(error.code);
    }
    throw error;
  }
}

export function isValidPadId(value: unknown): value is PadSoundId {
  return typeof value === 'string' && VALID_PAD_IDS.has(value);
}

export function createUserPadSongId(): string {
  return createUserSongId('pad-user');
}

function parseEvents(doc: Record<string, unknown>): PadSongEvent[] {
  const raw = asPadError(() => readEventArray(doc));

  const events: PadSongEvent[] = [];
  for (const entry of raw) {
    if (!isValidPadId(entry.padId)) {
      throw new UserPadSongParseError('invalidPad');
    }
    const atMs = readAtMs(entry.atMs);
    if (atMs === null) {
      throw new UserPadSongParseError('invalidSchema');
    }
    events.push({ padId: entry.padId, atMs });
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
  const doc = asPadError(() => parseJsonObject(text));
  const events = parseEvents(doc);

  return {
    id: createUserPadSongId(),
    title: readTitle(doc.title, options?.fallbackTitle),
    artist: readArtist(doc.artist),
    difficulty: parseDifficulty(doc.difficulty),
    events,
    partialCount: readPartialCount(doc.partialCount, events.length, DEFAULT_PARTIAL_COUNT),
  };
}

export function buildUserPadSongDefinition(input: {
  title: string;
  artist?: string;
  events: PadSongEvent[];
  difficulty?: PadSongDifficulty;
  partialCount?: number;
}): PadSongDefinition & { artist?: string } {
  const events = asPadError(() => finalizeEvents(input.events));

  return {
    id: createUserPadSongId(),
    title: readTitle(input.title),
    artist: readArtist(input.artist),
    difficulty: input.difficulty ?? 'medium',
    events,
    partialCount: readPartialCount(input.partialCount, events.length, DEFAULT_PARTIAL_COUNT),
  };
}
