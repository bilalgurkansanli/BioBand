// Validation shared by every instrument's user-song importer (JSON documents
// and the MIDI converters). The five schemas used to be near-identical copies,
// and a hardening fix made in one never reached the others — so the checks that
// keep a hostile or broken file from hurting the app live here, once.

/** Most events a user song may hold — keeps storage and the scorer bounded. */
export const MAX_USER_SONG_EVENTS = 800;

/** Longest title kept. A MIDI track name is free text and can be any size. */
export const MAX_USER_SONG_TITLE_LENGTH = 80;

/**
 * Latest onset a user song may place a note at. Far past any real song, but
 * finite: an onset at 1e300 ms is a lesson that never ends and arithmetic that
 * stops meaning anything.
 */
export const MAX_USER_SONG_AT_MS = 60 * 60_000;

/**
 * Longest written note length. Anything longer is clamped, not rejected — a
 * held pad or a tied whole note is plausible, a sustain the engine would
 * schedule a day ahead is not.
 */
export const MAX_USER_NOTE_DURATION_MS = 30_000;

/**
 * Largest chart file read into memory. A real song JSON is a few tens of KB and
 * a MIDI file rarely passes a few hundred; this only stops a wrong pick (a
 * video, a disk image) from being read whole on the JS thread.
 */
export const MAX_USER_SONG_FILE_BYTES = 2 * 1024 * 1024;

/** Failures every importer shares; each instrument adds its own id code. */
export type SongDocumentErrorCode =
  | 'invalidJson'
  | 'invalidSchema'
  | 'emptySong'
  | 'tooManyNotes';

/**
 * Thrown by the shared helpers. Each instrument's schema converts it into its
 * own exported error class, which is what its hook checks with `instanceof`.
 */
export class SongDocumentError extends Error {
  readonly code: SongDocumentErrorCode;

  constructor(code: SongDocumentErrorCode) {
    super(code);
    this.name = 'SongDocumentError';
    this.code = code;
  }
}

/**
 * Trim, collapse runs of whitespace and cap the length. Control characters go
 * too — a track name is free-form bytes and ends up rendered in a list row.
 */
export function cleanText(value: unknown, maxLength = MAX_USER_SONG_TITLE_LENGTH): string {
  if (typeof value !== 'string') {
    return '';
  }
  const collapsed = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(collapsed).slice(0, maxLength).join('').trim();
}

export function readTitle(value: unknown, fallback?: string): string {
  return cleanText(value) || cleanText(fallback) || 'Untitled';
}

export function readArtist(value: unknown): string | undefined {
  return cleanText(value) || undefined;
}

/** A note onset in ms, rounded — or null when missing, negative, non-finite or absurd. */
export function readAtMs(value: unknown): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_USER_SONG_AT_MS
  ) {
    return null;
  }
  return Math.round(value);
}

/** Optional written length: dropped when unusable, clamped when merely huge. */
export function readDurationMs(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.max(1, Math.min(MAX_USER_NOTE_DURATION_MS, Math.round(value)));
}

/** Optional 0..1 strike strength. */
export function readVelocity(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.min(1, value);
}

/** Parse the text as one JSON object, or throw the shared error. */
export function parseJsonObject(text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new SongDocumentError('invalidJson');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SongDocumentError('invalidSchema');
  }
  return parsed as Record<string, unknown>;
}

/** The document's `events` array, checked for shape and size before any item is read. */
export function readEventArray(doc: Record<string, unknown>): Record<string, unknown>[] {
  const raw = doc.events;
  if (!Array.isArray(raw)) {
    throw new SongDocumentError('invalidSchema');
  }
  if (raw.length === 0) {
    throw new SongDocumentError('emptySong');
  }
  if (raw.length > MAX_USER_SONG_EVENTS) {
    throw new SongDocumentError('tooManyNotes');
  }
  return raw.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new SongDocumentError('invalidSchema');
    }
    return item as Record<string, unknown>;
  });
}

/** How many leading events the "part" excerpt plays; defaults to `fallback`. */
export function readPartialCount(value: unknown, eventCount: number, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.max(1, Math.min(Math.round(value), eventCount));
  }
  return Math.min(fallback, eventCount);
}

type TimedEvent = { atMs: number; durationMs?: number };

/**
 * Final gate for converter output before it becomes a song: count limits and a
 * timeline every later stage can do arithmetic on. Returns a sorted copy.
 */
export function finalizeEvents<T extends TimedEvent>(events: T[]): T[] {
  if (events.length === 0) {
    throw new SongDocumentError('emptySong');
  }
  if (events.length > MAX_USER_SONG_EVENTS) {
    throw new SongDocumentError('tooManyNotes');
  }
  for (const event of events) {
    if (
      !Number.isFinite(event.atMs) ||
      event.atMs < 0 ||
      event.atMs > MAX_USER_SONG_AT_MS
    ) {
      throw new SongDocumentError('invalidSchema');
    }
    if (
      event.durationMs !== undefined &&
      (!Number.isFinite(event.durationMs) || event.durationMs <= 0)
    ) {
      throw new SongDocumentError('invalidSchema');
    }
  }
  return [...events].sort((a, b) => a.atMs - b.atMs);
}

/** `<prefix>-<time>-<random>`, the id shape every user-song store already holds. */
export function createUserSongId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
