import type { DrumSongDefinition } from '../instruments/drums/songs/types';
import { emptyList, listOf, readJsonOrFallback, updateJson } from './jsonStorage';

const STORAGE_KEY = '@bioband/user-drum-songs.v1';

export type UserDrumSongSource = 'json' | 'midi';

export type UserDrumSong = DrumSongDefinition & {
  source: UserDrumSongSource;
  importedAt: number;
  artist?: string;
};

const parseUserDrumSongs = listOf(isUserDrumSong);

export function loadUserDrumSongs(): Promise<UserDrumSong[]> {
  return readJsonOrFallback(STORAGE_KEY, parseUserDrumSongs, emptyList<UserDrumSong>);
}

export function saveUserDrumSong(song: UserDrumSong): Promise<UserDrumSong[]> {
  return updateJson(STORAGE_KEY, parseUserDrumSongs, emptyList<UserDrumSong>, (existing) => {
    const next = [song, ...existing.filter((item) => item.id !== song.id)];
    return { next, result: next };
  });
}

export function deleteUserDrumSong(songId: string): Promise<UserDrumSong[]> {
  return updateJson(STORAGE_KEY, parseUserDrumSongs, emptyList<UserDrumSong>, (existing) => {
    const next = existing.filter((item) => item.id !== songId);
    return { next, result: next };
  });
}

function isUserDrumSong(value: unknown): value is UserDrumSong {
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
