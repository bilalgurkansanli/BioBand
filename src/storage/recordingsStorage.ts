import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SavedRecording } from '../types/recording';
import {
  deleteRecordingAudio,
  migrateCachedRecordingAudio,
} from './recordingAudioStorage';

const STORAGE_KEY = '@bioband/recordings';

/**
 * Lenient shape check for stored takes. Deliberately only validates the fields
 * every code path relies on — dropping a user's recording because of a stricter
 * rule would be worse than keeping a slightly odd one.
 */
function isSavedRecording(value: unknown): value is SavedRecording {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as SavedRecording;
  return (
    typeof entry.id === 'string' &&
    typeof entry.createdAt === 'number' &&
    typeof entry.instrument === 'string' &&
    typeof entry.mode === 'string' &&
    typeof entry.durationMs === 'number'
  );
}

export async function saveRecording(recording: SavedRecording): Promise<void> {
  const existing = await loadRecordings();
  existing.unshift(recording);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export async function loadRecordings(): Promise<SavedRecording[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      // Corrupt/legacy value — treat as empty instead of crashing every caller
      // that expects to map/filter over an array.
      return [];
    }
    return parsed.filter(isSavedRecording);
  } catch {
    return [];
  }
}

export async function deleteRecording(recordingId: string): Promise<void> {
  const existing = await loadRecordings();
  const removed = existing.find((entry) => entry.id === recordingId);
  if (removed?.audioUri) {
    // Each take owns its copied audio file (Studio tracks get their own copy),
    // so dropping the entry without this would leak the file forever.
    deleteRecordingAudio(removed.audioUri);
  }
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(existing.filter((entry) => entry.id !== recordingId)),
  );
}

/**
 * One-shot rescue at startup for takes recorded before mic audio was copied
 * into Documents. Must not run while the takes list is being edited — the
 * read-modify-write below would clobber a concurrent delete.
 */
export async function migrateRecordingAudioToDocuments(): Promise<void> {
  const migrated = migrateCachedRecordingAudio(await loadRecordings());
  if (migrated) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  }
}

export async function renameRecording(
  recordingId: string,
  title: string,
): Promise<void> {
  const existing = await loadRecordings();
  const next = existing.map((entry) =>
    entry.id === recordingId ? { ...entry, title } : entry,
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
