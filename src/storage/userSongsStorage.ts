import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SongDefinition } from '../instruments/piano/songs/types';
import { deleteSongAudioBinding } from './songAudioBindingsStorage';

const STORAGE_KEY = '@bioband/user-songs.v1';

export type UserSongSource = 'json' | 'midi';

export type UserSong = SongDefinition & {
  source: UserSongSource;
  importedAt: number;
};

export async function loadUserSongs(): Promise<UserSong[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isUserSong);
  } catch {
    return [];
  }
}

export async function saveUserSong(song: UserSong): Promise<UserSong[]> {
  const existing = await loadUserSongs();
  const next = [song, ...existing.filter((item) => item.id !== song.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function deleteUserSong(songId: string): Promise<UserSong[]> {
  const existing = await loadUserSongs();
  const next = existing.filter((item) => item.id !== songId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
