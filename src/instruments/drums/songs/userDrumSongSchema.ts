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
import { DRUM_PADS, type DrumSoundId } from '../drumsSounds';
import type { DrumSongDefinition, DrumSongDifficulty, DrumSongEvent } from './types';

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
  | 'fileTooLarge'
  | 'unsupported';

export class UserDrumSongParseError extends Error {
  readonly code: UserDrumSongParseErrorCode;

  constructor(code: UserDrumSongParseErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'UserDrumSongParseError';
    this.code = code;
  }
}

/** Run a shared validation step, reporting its failure as this instrument's error. */
function asDrumError<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof SongDocumentError) {
      throw new UserDrumSongParseError(error.code);
    }
    throw error;
  }
}

export function isValidPadId(value: unknown): value is DrumSoundId {
  return typeof value === 'string' && VALID_PAD_IDS.has(value);
}

export function createUserDrumSongId(): string {
  return createUserSongId('drum-user');
}

function parseEvents(doc: Record<string, unknown>): DrumSongEvent[] {
  const raw = asDrumError(() => readEventArray(doc));

  const events: DrumSongEvent[] = [];
  for (const entry of raw) {
    if (!isValidPadId(entry.padId)) {
      throw new UserDrumSongParseError('invalidPad');
    }
    const atMs = readAtMs(entry.atMs);
    if (atMs === null) {
      throw new UserDrumSongParseError('invalidSchema');
    }
    events.push({ padId: entry.padId, atMs });
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
  const doc = asDrumError(() => parseJsonObject(text));
  const events = parseEvents(doc);

  return {
    id: createUserDrumSongId(),
    title: readTitle(doc.title, options?.fallbackTitle),
    artist: readArtist(doc.artist),
    difficulty: parseDifficulty(doc.difficulty),
    events,
    partialCount: readPartialCount(doc.partialCount, events.length, DEFAULT_PARTIAL_COUNT),
  };
}

export function buildUserDrumSongDefinition(input: {
  title: string;
  artist?: string;
  events: DrumSongEvent[];
  difficulty?: DrumSongDifficulty;
  partialCount?: number;
}): DrumSongDefinition & { artist?: string } {
  const events = asDrumError(() => finalizeEvents(input.events));

  return {
    id: createUserDrumSongId(),
    title: readTitle(input.title),
    artist: readArtist(input.artist),
    difficulty: input.difficulty ?? 'medium',
    events,
    partialCount: readPartialCount(input.partialCount, events.length, DEFAULT_PARTIAL_COUNT),
  };
}
