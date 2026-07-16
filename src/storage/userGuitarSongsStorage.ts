import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GuitarSongDefinition } from '../instruments/guitar/songs/types';

const STORAGE_KEY = '@bioband/user-guitar-songs.v1';

export type UserGuitarSongSource = 'json' | 'midi';

export type UserGuitarSong = GuitarSongDefinition & {
  source: UserGuitarSongSource;
  importedAt: number;
  artist?: string;
};

export async function loadUserGuitarSongs(): Promise<UserGuitarSong[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isUserGuitarSong);
  } catch {
    return [];
  }
}

export async function saveUserGuitarSong(song: UserGuitarSong): Promise<UserGuitarSong[]> {
  const existing = await loadUserGuitarSongs();
  const next = [song, ...existing.filter((item) => item.id !== song.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function deleteUserGuitarSong(songId: string): Promise<UserGuitarSong[]> {
  const existing = await loadUserGuitarSongs();
  const next = existing.filter((item) => item.id !== songId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
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
