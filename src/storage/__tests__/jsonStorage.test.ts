import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  corruptBackupKey,
  emptyList,
  isSameJson,
  listOf,
  readJson,
  readJsonOrFallback,
  StorageReadError,
  updateJson,
  withStorageLock,
} from '../jsonStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = '@test/list';
const isNumber = (value: unknown): value is number => typeof value === 'number';
const parseNumbers = listOf(isNumber);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('readJson', () => {
  it('returns the fallback for an absent key without writing anything', async () => {
    await expect(readJson(KEY, parseNumbers, emptyList<number>)).resolves.toEqual([]);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('returns the parsed value, dropping entries that fail the item check', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify([1, 'two', 3]));
    await expect(readJson(KEY, parseNumbers, emptyList<number>)).resolves.toEqual([1, 3]);
  });

  it('keeps a copy of unparseable JSON before falling back', async () => {
    await AsyncStorage.setItem(KEY, '{not json');
    await expect(readJson(KEY, parseNumbers, emptyList<number>)).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(corruptBackupKey(KEY))).resolves.toBe('{not json');
  });

  it('treats a value of the wrong shape as corrupt too', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ not: 'a list' }));
    await readJson(KEY, parseNumbers, emptyList<number>);
    await expect(AsyncStorage.getItem(corruptBackupKey(KEY))).resolves.toBe('{"not":"a list"}');
  });

  it('never replaces the first corrupt copy with a later one', async () => {
    await AsyncStorage.setItem(KEY, 'first');
    await readJson(KEY, parseNumbers, emptyList<number>);
    await AsyncStorage.setItem(KEY, 'second');
    await readJson(KEY, parseNumbers, emptyList<number>);
    await expect(AsyncStorage.getItem(corruptBackupKey(KEY))).resolves.toBe('first');
  });

  it('throws a StorageReadError when storage cannot be read', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk I/O'));
    await expect(readJson(KEY, parseNumbers, emptyList<number>)).rejects.toBeInstanceOf(
      StorageReadError,
    );
  });

  it('fails rather than continuing when the corrupt copy cannot be made', async () => {
    await AsyncStorage.setItem(KEY, '{not json');
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    await expect(readJson(KEY, parseNumbers, emptyList<number>)).rejects.toThrow('disk full');
  });
});

describe('readJsonOrFallback', () => {
  it('degrades a storage failure to the fallback', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk I/O'));
    await expect(readJsonOrFallback(KEY, parseNumbers, emptyList<number>)).resolves.toEqual([]);
  });
});

describe('updateJson', () => {
  it('does not write when the read fails', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify([1, 2, 3]));
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk I/O'));

    await expect(
      updateJson(KEY, parseNumbers, emptyList<number>, (all) => ({ next: [...all, 4], result: 0 })),
    ).rejects.toBeInstanceOf(StorageReadError);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe('[1,2,3]');
  });

  it('leaves storage alone when the update returns no next value', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify([1]));
    jest.clearAllMocks();
    await expect(
      updateJson(KEY, parseNumbers, emptyList<number>, () => ({ result: 'unchanged' })),
    ).resolves.toBe('unchanged');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('serialises concurrent read-modify-writes so none is lost', async () => {
    const append = (value: number) =>
      updateJson(KEY, parseNumbers, emptyList<number>, async (all) => {
        // Yield between read and write, which is where an unlocked pair interleaves.
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { next: [...all, value], result: undefined };
      });

    await Promise.all([append(1), append(2), append(3)]);

    const stored = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]') as number[];
    expect(stored.sort()).toEqual([1, 2, 3]);
  });
});

describe('withStorageLock', () => {
  it('keeps the queue moving after an operation rejects', async () => {
    const failed = withStorageLock(KEY, async () => {
      throw new Error('boom');
    });
    const next = withStorageLock(KEY, async () => 'ran');
    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ran');
  });

  it('does not make other keys wait', async () => {
    let release: () => void = () => undefined;
    const blocker = withStorageLock(KEY, () => new Promise<void>((resolve) => (release = resolve)));
    await expect(withStorageLock('@test/other', async () => 'free')).resolves.toBe('free');
    release();
    await blocker;
  });
});

describe('isSameJson', () => {
  it('ignores object key order', () => {
    expect(isSameJson({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true);
  });

  it('respects array order and length', () => {
    expect(isSameJson([1, 2], [2, 1])).toBe(false);
    expect(isSameJson([1], [1, 1])).toBe(false);
  });

  it('treats undefined members as absent, as JSON does', () => {
    expect(isSameJson({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });

  it('tells null, objects and primitives apart', () => {
    expect(isSameJson(null, {})).toBe(false);
    expect(isSameJson({ a: null }, { a: 0 })).toBe(false);
    expect(isSameJson('1', 1)).toBe(false);
  });
});
