import type { ViolinSongDefinition } from '../instruments/violin/songs/types';
import { emptyList, listOf, readJsonOrFallback, updateJson } from './jsonStorage';

const STORAGE_KEY = '@bioband/user-violin-songs.v1';

export type UserViolinSongSource = 'json' | 'midi';

export type UserViolinSong = ViolinSongDefinition & {
  source: UserViolinSongSource;
  importedAt: number;
  artist?: string;
};

const parseUserViolinSongs = listOf(isUserViolinSong);

export function loadUserViolinSongs(): Promise<UserViolinSong[]> {
  return readJsonOrFallback(STORAGE_KEY, parseUserViolinSongs, emptyList<UserViolinSong>);
}

export function saveUserViolinSong(song: UserViolinSong): Promise<UserViolinSong[]> {
  return updateJson(STORAGE_KEY, parseUserViolinSongs, emptyList<UserViolinSong>, (existing) => {
    const next = [song, ...existing.filter((item) => item.id !== song.id)];
    return { next, result: next };
  });
}

export function deleteUserViolinSong(songId: string): Promise<UserViolinSong[]> {
  return updateJson(STORAGE_KEY, parseUserViolinSongs, emptyList<UserViolinSong>, (existing) => {
    const next = existing.filter((item) => item.id !== songId);
    return { next, result: next };
  });
}

function isUserViolinSong(value: unknown): value is UserViolinSong {
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
