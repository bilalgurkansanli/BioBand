import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DrumSongDefinition } from '../instruments/drums/songs/types';

const STORAGE_KEY = '@bioband/user-drum-songs.v1';

export type UserDrumSongSource = 'json' | 'midi';

export type UserDrumSong = DrumSongDefinition & {
  source: UserDrumSongSource;
  importedAt: number;
  artist?: string;
};

export async function loadUserDrumSongs(): Promise<UserDrumSong[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isUserDrumSong);
  } catch {
    return [];
  }
}

export async function saveUserDrumSong(song: UserDrumSong): Promise<UserDrumSong[]> {
  const existing = await loadUserDrumSongs();
  const next = [song, ...existing.filter((item) => item.id !== song.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function deleteUserDrumSong(songId: string): Promise<UserDrumSong[]> {
  const existing = await loadUserDrumSongs();
  const next = existing.filter((item) => item.id !== songId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
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
