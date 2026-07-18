import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PadSongDefinition } from '../instruments/pads/songs/types';

const STORAGE_KEY = '@bioband/user-pad-songs.v1';

export type UserPadSongSource = 'json' | 'midi';

export type UserPadSong = PadSongDefinition & {
  source: UserPadSongSource;
  importedAt: number;
  artist?: string;
};

export async function loadUserPadSongs(): Promise<UserPadSong[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isUserPadSong);
  } catch {
    return [];
  }
}

export async function saveUserPadSong(song: UserPadSong): Promise<UserPadSong[]> {
  const existing = await loadUserPadSongs();
  const next = [song, ...existing.filter((item) => item.id !== song.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function deleteUserPadSong(songId: string): Promise<UserPadSong[]> {
  const existing = await loadUserPadSongs();
  const next = existing.filter((item) => item.id !== songId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
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
