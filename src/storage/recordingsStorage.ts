import type { SavedRecording } from '../types/recording';
import { emptyList, listOf, readJson, updateJson } from './jsonStorage';
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

const parseRecordings = listOf(isSavedRecording);

function updateRecordings<R>(
  update: (existing: SavedRecording[]) => { next?: SavedRecording[]; result: R },
): Promise<R> {
  return updateJson(STORAGE_KEY, parseRecordings, emptyList<SavedRecording>, update);
}

export function saveRecording(recording: SavedRecording): Promise<void> {
  return updateRecordings((existing) => ({
    next: [recording, ...existing],
    result: undefined,
  }));
}

/**
 * Rejects when storage cannot be read rather than answering with an empty
 * list: this is what a library backup is built from, and an empty backup that
 * reports success is worse than one that fails.
 */
export function loadRecordings(): Promise<SavedRecording[]> {
  return readJson(STORAGE_KEY, parseRecordings, emptyList<SavedRecording>);
}

export function deleteRecording(recordingId: string): Promise<void> {
  return updateRecordings((existing) => {
    const removed = existing.find((entry) => entry.id === recordingId);
    if (removed?.audioUri) {
      // Each take owns its copied audio file (Studio tracks get their own copy),
      // so dropping the entry without this would leak the file forever.
      deleteRecordingAudio(removed.audioUri);
    }
    return {
      next: existing.filter((entry) => entry.id !== recordingId),
      result: undefined,
    };
  });
}

/**
 * One-shot rescue at startup for takes recorded before mic audio was copied
 * into Documents. Runs under the same lock as every other write to the list,
 * so a concurrent save or delete can no longer be clobbered by it.
 */
export function migrateRecordingAudioToDocuments(): Promise<void> {
  return updateRecordings((existing) => ({
    next: migrateCachedRecordingAudio(existing) ?? undefined,
    result: undefined,
  }));
}

export function renameRecording(recordingId: string, title: string): Promise<void> {
  return updateRecordings((existing) => ({
    next: existing.map((entry) => (entry.id === recordingId ? { ...entry, title } : entry)),
    result: undefined,
  }));
}
