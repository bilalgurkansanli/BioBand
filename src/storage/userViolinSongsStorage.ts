import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ViolinSongDefinition } from '../instruments/violin/songs/types';

const STORAGE_KEY = '@bioband/user-violin-songs.v1';

export type UserViolinSongSource = 'json';

export type UserViolinSong = ViolinSongDefinition & {
  source: UserViolinSongSource;
  importedAt: number;
  artist?: string;
};

export async function loadUserViolinSongs(): Promise<UserViolinSong[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isUserViolinSong);
  } catch {
    return [];
  }
}

export async function saveUserViolinSong(song: UserViolinSong): Promise<UserViolinSong[]> {
  const existing = await loadUserViolinSongs();
  const next = [song, ...existing.filter((item) => item.id !== song.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function deleteUserViolinSong(songId: string): Promise<UserViolinSong[]> {
  const existing = await loadUserViolinSongs();
  const next = existing.filter((item) => item.id !== songId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
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
    song.source === 'json' &&
    typeof song.importedAt === 'number' &&
    (song.difficulty === 'easy' ||
      song.difficulty === 'medium' ||
      song.difficulty === 'hard')
  );
}
