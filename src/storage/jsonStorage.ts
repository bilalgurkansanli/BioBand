import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thrown when storage itself cannot be read, as opposed to a key that is
 * absent or holds garbage.
 *
 * The difference is the whole point. A list that comes back empty because the
 * read failed still exists on disk, and a read-modify-write that carried on
 * with that empty list would persist `[new item]` over the user's entire
 * library. Anything about to write has to stop here instead.
 */
export class StorageReadError extends Error {
  constructor(
    readonly key: string,
    readonly reason: unknown,
  ) {
    super(`Could not read "${key}" from storage.`);
    this.name = 'StorageReadError';
  }
}

/** Where a value that no longer parses is parked before its key is reused. */
export function corruptBackupKey(key: string): string {
  return `${key}.corrupt-backup`;
}

/**
 * Reads one JSON value.
 *
 *  - absent key → `fallback()`
 *  - storage unreadable → throws {@link StorageReadError}; nothing is written
 *  - unparseable, or rejected by `parse` → the raw string is copied to
 *    {@link corruptBackupKey} first, then `fallback()`
 *
 * `parse` receives the decoded JSON and returns the typed value, or null when
 * the shape is wrong.
 */
export async function readJson<T>(
  key: string,
  parse: (value: unknown) => T | null,
  fallback: () => T,
): Promise<T> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch (error) {
    throw new StorageReadError(key, error);
  }
  if (raw === null || raw === '') {
    return fallback();
  }

  let parsed: T | null = null;
  try {
    parsed = parse(JSON.parse(raw));
  } catch {
    parsed = null;
  }
  if (parsed !== null) {
    return parsed;
  }

  await backUpCorruptValue(key, raw);
  return fallback();
}

/**
 * For screens: same as {@link readJson}, but a storage failure degrades to the
 * fallback instead of rejecting. Safe only because nothing writes the result
 * back — every write path goes through {@link updateJson}, which stays strict.
 */
export async function readJsonOrFallback<T>(
  key: string,
  parse: (value: unknown) => T | null,
  fallback: () => T,
): Promise<T> {
  try {
    return await readJson(key, parse, fallback);
  } catch (error) {
    console.warn(`[storage] "${key}" could not be read`, error);
    return fallback();
  }
}

/**
 * The first corrupt value is the one most likely to still hold the user's real
 * data; anything corrupt later was saved on top of the reset that followed, so
 * it never replaces the first copy.
 *
 * A failure to make the copy propagates: overwriting the only copy of the
 * original is exactly the loss this exists to prevent.
 */
async function backUpCorruptValue(key: string, raw: string): Promise<void> {
  const backupKey = corruptBackupKey(key);
  let existing: string | null;
  try {
    existing = await AsyncStorage.getItem(backupKey);
  } catch (error) {
    throw new StorageReadError(backupKey, error);
  }
  if (existing !== null) {
    return;
  }
  await AsyncStorage.setItem(backupKey, raw);
  console.warn(`[storage] "${key}" held unreadable data; kept a copy under "${backupKey}"`);
}

const queues = new Map<string, Promise<unknown>>();

/**
 * Runs `operation` once every earlier operation on the same key has settled.
 *
 * Read-modify-write on AsyncStorage is not atomic: two saves that both read
 * before either writes each persist their own copy, and one of them is
 * silently lost — a BPM change landing during a track patch, say. Serialising
 * per key closes that window without making unrelated keys wait.
 *
 * Not re-entrant: an operation that takes the same key's lock again waits on
 * itself forever. Locked bodies use the plain readers, never another locked
 * call on the same key.
 */
export function withStorageLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const run = previous.then(operation, operation);
  queues.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

export type JsonUpdate<T, R> = {
  /** The value to store; leave it out to keep storage untouched. */
  next?: T;
  result: R;
};

/** A locked, strict read-modify-write of one JSON key. */
export function updateJson<T, R>(
  key: string,
  parse: (value: unknown) => T | null,
  fallback: () => T,
  update: (current: T) => JsonUpdate<T, R> | Promise<JsonUpdate<T, R>>,
): Promise<R> {
  return withStorageLock(key, async () => {
    const current = await readJson(key, parse, fallback);
    const { next, result } = await update(current);
    if (next !== undefined) {
      await AsyncStorage.setItem(key, JSON.stringify(next));
    }
    return result;
  });
}

/**
 * A parser for a stored list: anything but an array is corrupt; individual
 * entries that fail `isItem` are dropped, as every list store here always has.
 */
export function listOf<T>(isItem: (value: unknown) => value is T): (value: unknown) => T[] | null {
  return (value) => (Array.isArray(value) ? value.filter(isItem) : null);
}

export function emptyList<T>(): T[] {
  return [];
}

/**
 * Structural equality for JSON-shaped values, ignoring object key order.
 *
 * Postgres `jsonb` hands objects back with its own key order, so comparing
 * serialised strings would call every round-tripped value "changed".
 */
export function isSameJson(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => isSameJson(item, b[index]))
    );
  }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  // `undefined` members vanish in JSON, so they must not count as a difference.
  const keysOf = (value: object) =>
    Object.keys(value).filter((key) => (value as Record<string, unknown>)[key] !== undefined);
  const aKeys = keysOf(a);
  const bKeys = keysOf(b);
  return (
    aKeys.length === bKeys.length &&
    aKeys.every((key) =>
      isSameJson((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    )
  );
}
