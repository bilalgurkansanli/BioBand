import { Directory, File, Paths } from 'expo-file-system';

import type { SongBackingTrack, SongDefinition } from '../instruments/piano/songs/types';
import { songHasBackingAudio } from '../instruments/piano/songs/types';
import { emptyList, listOf, readJsonOrFallback, updateJson } from './jsonStorage';

const STORAGE_KEY = '@bioband/song-audio-bindings.v1';

export type SongAudioBinding = {
  songId: string;
  localUri: string;
  eventsStartMs: number;
  /** Separate piano-less stem file (karaoke / stem-separated). */
  pianoLessLocalUri?: string;
};

function getSongAudioDirectory(): Directory {
  const dir = new Directory(Paths.document, 'song-audio');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function extensionFromNameOrUri(nameOrUri: string): string {
  const match = nameOrUri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase() ?? 'mp3';
  if (ext === 'm4a' || ext === 'mp3' || ext === 'wav' || ext === 'aac' || ext === 'caf' || ext === 'mp4') {
    return ext;
  }
  return 'mp3';
}

/** Copy a picked audio file into app documents so the URI survives restarts. */
export function copySongAudioFile(
  songId: string,
  sourceUri: string,
  fileNameHint?: string,
): string {
  const dir = getSongAudioDirectory();
  const ext = extensionFromNameOrUri(fileNameHint ?? sourceUri);
  const safeId = songId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const destination = new File(dir, `${safeId}.${ext}`);
  if (destination.exists) {
    destination.delete();
  }
  new File(sourceUri).copySync(destination);
  return destination.uri;
}

/** Copy a picked piano-less stem into app documents. */
export function copySongPianoLessFile(
  songId: string,
  sourceUri: string,
  fileNameHint?: string,
): string {
  const dir = getSongAudioDirectory();
  const ext = extensionFromNameOrUri(fileNameHint ?? sourceUri);
  const safeId = songId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const destination = new File(dir, `${safeId}-pianoless.${ext}`);
  if (destination.exists) {
    destination.delete();
  }
  new File(sourceUri).copySync(destination);
  return destination.uri;
}

export function deleteSongAudioFile(localUri: string): void {
  try {
    const file = new File(localUri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup.
  }
}

const parseBindings = listOf(isSongAudioBinding);

function updateBindings(
  update: (existing: SongAudioBinding[]) => SongAudioBinding[],
): Promise<SongAudioBinding[]> {
  return updateJson(STORAGE_KEY, parseBindings, emptyList<SongAudioBinding>, (existing) => {
    const next = update(existing);
    return { next, result: next };
  });
}

export function loadSongAudioBindings(): Promise<SongAudioBinding[]> {
  return readJsonOrFallback(STORAGE_KEY, parseBindings, emptyList<SongAudioBinding>);
}

export async function getSongAudioBinding(
  songId: string,
): Promise<SongAudioBinding | null> {
  const all = await loadSongAudioBindings();
  return all.find((entry) => entry.songId === songId) ?? null;
}

export function saveSongAudioBinding(
  binding: SongAudioBinding,
): Promise<SongAudioBinding[]> {
  return updateBindings((existing) => {
    const prev = existing.find((entry) => entry.songId === binding.songId);
    if (prev && prev.localUri !== binding.localUri) {
      deleteSongAudioFile(prev.localUri);
    }
    if (prev?.pianoLessLocalUri && prev.pianoLessLocalUri !== binding.pianoLessLocalUri) {
      deleteSongAudioFile(prev.pianoLessLocalUri);
    }
    return [binding, ...existing.filter((entry) => entry.songId !== binding.songId)];
  });
}

export function deleteSongAudioBinding(songId: string): Promise<SongAudioBinding[]> {
  return updateBindings((existing) => {
    const prev = existing.find((entry) => entry.songId === songId);
    if (prev) {
      deleteSongAudioFile(prev.localUri);
      if (prev.pianoLessLocalUri) {
        deleteSongAudioFile(prev.pianoLessLocalUri);
      }
    }
    return existing.filter((entry) => entry.songId !== songId);
  });
}

/**
 * Merge persisted user audio onto a catalog/user song definition.
 * Binding URI/offset wins when present.
 */
export async function mergeSongWithAudioBinding(
  song: SongDefinition,
): Promise<SongDefinition> {
  const binding = await getSongAudioBinding(song.id);
  if (!binding) {
    return song;
  }

  const backingTrack: SongBackingTrack = {
    ...(song.backingTrack?.module != null
      ? { module: song.backingTrack.module }
      : {}),
    uri: binding.localUri,
    ...(binding.pianoLessLocalUri
      ? { pianoLessUri: binding.pianoLessLocalUri }
      : {}),
    eventsStartMs: binding.eventsStartMs,
  };

  return { ...song, backingTrack };
}

export { songHasBackingAudio };

function isSongAudioBinding(value: unknown): value is SongAudioBinding {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.songId === 'string' &&
    typeof entry.localUri === 'string' &&
    typeof entry.eventsStartMs === 'number' &&
    Number.isFinite(entry.eventsStartMs) &&
    (entry.pianoLessLocalUri === undefined ||
      typeof entry.pianoLessLocalUri === 'string')
  );
}
