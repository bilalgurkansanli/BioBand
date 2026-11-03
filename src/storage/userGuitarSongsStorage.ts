import type { GuitarSongDefinition } from '../instruments/guitar/songs/types';
import { emptyList, listOf, readJsonOrFallback, updateJson } from './jsonStorage';

const STORAGE_KEY = '@bioband/user-guitar-songs.v1';

export type UserGuitarSongSource = 'json' | 'midi';

export type UserGuitarSong = GuitarSongDefinition & {
  source: UserGuitarSongSource;
  importedAt: number;
  artist?: string;
};

const parseUserGuitarSongs = listOf(isUserGuitarSong);

export function loadUserGuitarSongs(): Promise<UserGuitarSong[]> {
  return readJsonOrFallback(STORAGE_KEY, parseUserGuitarSongs, emptyList<UserGuitarSong>);
}

export function saveUserGuitarSong(song: UserGuitarSong): Promise<UserGuitarSong[]> {
  return updateJson(STORAGE_KEY, parseUserGuitarSongs, emptyList<UserGuitarSong>, (existing) => {
    const next = [song, ...existing.filter((item) => item.id !== song.id)];
    return { next, result: next };
  });
}

export function deleteUserGuitarSong(songId: string): Promise<UserGuitarSong[]> {
  return updateJson(STORAGE_KEY, parseUserGuitarSongs, emptyList<UserGuitarSong>, (existing) => {
    const next = existing.filter((item) => item.id !== songId);
    return { next, result: next };
  });
}

function isUserGuitarSong(value: unknown): value is UserGuitarSong {
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
