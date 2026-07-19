import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@bioband/drum-machine-song.v1';

export const SONG_REPEAT_OPTIONS = [1, 2, 4] as const;
export type SongRepeatCount = (typeof SONG_REPEAT_OPTIONS)[number];

/** One chain slot — references a saved pattern or a preset by id. */
export type DrumMachineSongEntry = {
  patternId: string;
  repeats: SongRepeatCount;
};

function isSongRepeatCount(value: unknown): value is SongRepeatCount {
  return (SONG_REPEAT_OPTIONS as readonly number[]).includes(value as number);
}

function isSongEntry(value: unknown): value is DrumMachineSongEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as DrumMachineSongEntry;
  return typeof entry.patternId === 'string' && isSongRepeatCount(entry.repeats);
}

export async function loadDrumMachineSong(): Promise<DrumMachineSongEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isSongEntry);
  } catch {
    return [];
  }
}

export async function saveDrumMachineSong(
  entries: DrumMachineSongEntry[],
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
