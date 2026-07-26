import { Directory, File, Paths } from 'expo-file-system';

import type { SavedRecording } from '../types/recording';

function getRecordingAudioDirectory(): Directory {
  const dir = new Directory(Paths.document, 'recording-audio');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase() ?? 'm4a';
  if (
    ext === 'm4a' ||
    ext === 'mp3' ||
    ext === 'wav' ||
    ext === 'aac' ||
    ext === 'caf' ||
    ext === 'mp4'
  ) {
    return ext;
  }
  return 'm4a';
}

/** True for a uri this module owns — everything under Documents is ours. */
function isDocumentUri(uri: string): boolean {
  return uri.startsWith(Paths.document.uri);
}

/**
 * Copy a finished mic take out of the OS cache into Documents.
 *
 * `expo-audio` records into the cache directory: the OS purges it under
 * storage pressure and iOS keeps it out of backups, so a take left there
 * still shows up in the library but plays nothing. Returns the source uri
 * unchanged when the copy fails — a take that might be purged later is still
 * better than throwing the recording away right now.
 */
export function persistRecordingAudio(recordingId: string, sourceUri: string): string {
  try {
    const dir = getRecordingAudioDirectory();
    const safeId = recordingId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const destination = new File(dir, `${safeId}.${extensionFromUri(sourceUri)}`);
    if (destination.exists) {
      destination.delete();
    }
    new File(sourceUri).copy(destination);
    return destination.uri;
  } catch (error) {
    console.warn('[persistRecordingAudio]', error);
    return sourceUri;
  }
}

export function deleteRecordingAudio(localUri: string): void {
  try {
    const file = new File(localUri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup.
  }
}

/**
 * Rescue takes saved before the copy above existed: their audio still points
 * at the cache directory. Copies whatever the OS has not purged yet into
 * Documents and returns the rewritten list, or null when nothing changed —
 * the caller then skips the write entirely.
 */
export function migrateCachedRecordingAudio(
  recordings: SavedRecording[],
): SavedRecording[] | null {
  let changed = false;
  const migrated = recordings.map((entry) => {
    if (!entry.audioUri || isDocumentUri(entry.audioUri)) {
      return entry;
    }
    const localUri = persistRecordingAudio(entry.id, entry.audioUri);
    if (localUri === entry.audioUri) {
      // Already gone from the cache (or the copy failed) — leave the entry
      // alone so a later launch can try again if the file reappears.
      return entry;
    }
    changed = true;
    return { ...entry, audioUri: localUri };
  });
  return changed ? migrated : null;
}
