/// <reference types="node" />
// The one test that reads the source tree, hence the one that needs Node's types.
import fs from 'fs';
import path from 'path';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ALL_APP_DATA_KEYS,
  GUEST_WIPE_DIRECTORIES,
  ONBOARDING_SEEN_KEY,
  wipeGuestAppData,
} from '../appDataKeys';
import { corruptBackupKey } from '../jsonStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockDeleted: string[] = [];
jest.mock('expo-file-system', () => ({
  Paths: { document: 'document', cache: 'cache' },
  Directory: class {
    readonly exists = true;
    readonly path: string;
    constructor(base: string, name: string) {
      this.path = `${base}/${name}`;
    }
    delete() {
      mockDeleted.push(this.path);
    }
  },
}));

const SRC = path.resolve(__dirname, '../..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Every `new Directory(Paths.document|cache, '<name>')` the app constructs. */
function directoriesWrittenByApp(): string[] {
  const found = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/new Directory\(\s*Paths\.(document|cache)\s*,\s*'([^']+)'/g)) {
      found.add(`${match[1]}/${match[2]}`);
    }
  }
  return [...found].sort();
}

/** Every `…_KEY = '…'` constant declared by a storage module. */
function storageKeysDeclared(): string[] {
  const keys = new Set<string>();
  for (const file of sourceFiles(path.join(SRC, 'storage'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/_KEY = '([^']+)'/g)) {
      keys.add(match[1]);
    }
  }
  return [...keys].sort();
}

describe('guest wipe coverage', () => {
  it('finds the directories it is checking (guards the scan itself)', () => {
    expect(directoriesWrittenByApp()).toEqual(
      expect.arrayContaining(['document/recording-audio', 'cache/bioband-backups']),
    );
  });

  it('wipes every directory the app writes files into', () => {
    const wiped = GUEST_WIPE_DIRECTORIES.map(({ base, name }) => `${base}/${name}`);
    expect(wiped).toEqual(expect.arrayContaining(directoriesWrittenByApp()));
  });

  it('wipes every key a storage module declares, bar the deliberate exceptions', () => {
    // Device preferences that must survive a guest reset; see ALL_APP_DATA_KEYS.
    const kept = [ONBOARDING_SEEN_KEY, '@bioband/onboarding.v1'];
    const missing = storageKeysDeclared().filter(
      (key) => !ALL_APP_DATA_KEYS.includes(key) && !kept.includes(key),
    );
    expect(missing).toEqual([]);
  });
});

describe('wipeGuestAppData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockDeleted.length = 0;
  });

  it('removes the keys, their corrupt-value copies and every directory', async () => {
    await AsyncStorage.setItem('@bioband/recordings', '[]');
    await AsyncStorage.setItem(corruptBackupKey('@bioband/recordings'), 'garbage');
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');

    await wipeGuestAppData();

    await expect(AsyncStorage.getItem('@bioband/recordings')).resolves.toBeNull();
    await expect(AsyncStorage.getItem(corruptBackupKey('@bioband/recordings'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(ONBOARDING_SEEN_KEY)).resolves.toBe('true');
    expect(mockDeleted.sort()).toEqual(
      GUEST_WIPE_DIRECTORIES.map(({ base, name }) => `${base}/${name}`).sort(),
    );
  });
});
