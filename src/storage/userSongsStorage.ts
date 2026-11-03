import type { SongDefinition } from '../instruments/piano/songs/types';
import { emptyList, listOf, readJsonOrFallback, updateJson } from './jsonStorage';
import { deleteSongAudioBinding } from './songAudioBindingsStorage';

const STORAGE_KEY = '@bioband/user-songs.v1';

export type UserSongSource = 'json' | 'midi';

export type UserSong = SongDefinition & {
  source: UserSongSource;
  importedAt: number;
};

const parseUserSongs = listOf(isUserSong);

export function loadUserSongs(): Promise<UserSong[]> {
  return readJsonOrFallback(STORAGE_KEY, parseUserSongs, emptyList<UserSong>);
}

export function saveUserSong(song: UserSong): Promise<UserSong[]> {
  return updateJson(STORAGE_KEY, parseUserSongs, emptyList<UserSong>, (existing) => {
    const next = [song, ...existing.filter((item) => item.id !== song.id)];
    return { next, result: next };
  });
}

export async function deleteUserSong(songId: string): Promise<UserSong[]> {
  const next = await updateJson(
    STORAGE_KEY,
    parseUserSongs,
    emptyList<UserSong>,
    (existing) => {
      const remaining = existing.filter((item) => item.id !== songId);
      return { next: remaining, result: remaining };
    },
  );
  await deleteSongAudioBinding(songId);
  return next;
}

function isUserSong(value: unknown): value is UserSong {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const song = value as Record<string, unknown>;
  return (
    typeof song.id === 'string' &&
    typeof song.title === 'string' &&
    typeof song.previewDurationMs === 'number' &&
    Array.isArray(song.events) &&
    (song.source === 'json' || song.source === 'midi') &&
    typeof song.importedAt === 'number'
  );
}
