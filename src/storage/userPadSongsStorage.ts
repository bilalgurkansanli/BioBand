import type { PadSongDefinition } from '../instruments/pads/songs/types';
import { emptyList, listOf, readJsonOrFallback, updateJson } from './jsonStorage';

const STORAGE_KEY = '@bioband/user-pad-songs.v1';

export type UserPadSongSource = 'json' | 'midi';

export type UserPadSong = PadSongDefinition & {
  source: UserPadSongSource;
  importedAt: number;
  artist?: string;
};

const parseUserPadSongs = listOf(isUserPadSong);

export function loadUserPadSongs(): Promise<UserPadSong[]> {
  return readJsonOrFallback(STORAGE_KEY, parseUserPadSongs, emptyList<UserPadSong>);
}

export function saveUserPadSong(song: UserPadSong): Promise<UserPadSong[]> {
  return updateJson(STORAGE_KEY, parseUserPadSongs, emptyList<UserPadSong>, (existing) => {
    const next = [song, ...existing.filter((item) => item.id !== song.id)];
    return { next, result: next };
  });
}

export function deleteUserPadSong(songId: string): Promise<UserPadSong[]> {
  return updateJson(STORAGE_KEY, parseUserPadSongs, emptyList<UserPadSong>, (existing) => {
    const next = existing.filter((item) => item.id !== songId);
    return { next, result: next };
  });
}

function isUserPadSong(value: unknown): value is UserPadSong {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const song = value as Record<string, unknown>;
  return (
    typeof song.id === 'string' &&
    typeof song.title === 'string' &&
    Array.isArray(song.events) &&
    (song.source === 'json' || song.source === 'midi') &&
    typeof song.importedAt === 'number' &&
    (song.difficulty === 'easy' ||
      song.difficulty === 'medium' ||
      song.difficulty === 'hard')
  );
}
