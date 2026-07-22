import { useCallback, useEffect, useState } from 'react';
import { File } from 'expo-file-system';

import type { ViolinSongDefinition } from '../instruments/violin/songs/types';
import {
  parseUserViolinSongJson,
  UserViolinSongParseError,
  type UserViolinSongParseErrorCode,
} from '../instruments/violin/songs/userViolinSongSchema';
import {
  deleteUserViolinSong,
  loadUserViolinSongs,
  saveUserViolinSong,
  type UserViolinSong,
} from '../storage/userViolinSongsStorage';
import { pickJsonDocument } from '../utils/documentPicker';

export type ImportViolinSongResult =
  | { ok: true; song: UserViolinSong }
  | {
      ok: false;
      code: UserViolinSongParseErrorCode | 'canceled' | 'pickerUnavailable';
    };

async function persistSong(
  definition: ViolinSongDefinition & { artist?: string },
  setSongs: (songs: UserViolinSong[]) => void,
): Promise<UserViolinSong> {
  const userSong: UserViolinSong = {
    ...definition,
    source: 'json',
    importedAt: Date.now(),
  };
  const next = await saveUserViolinSong(userSong);
  setSongs(next);
  return userSong;
}

export function useUserViolinSongs() {
  const [songs, setSongs] = useState<UserViolinSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadUserViolinSongs();
      if (!cancelled) {
        setSongs(loaded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const importSong = useCallback(async (): Promise<ImportViolinSongResult> => {
    setImporting(true);
    try {
      const picked = await pickJsonDocument();
      if (!picked.ok) {
        return { ok: false, code: picked.code };
      }

      const { asset } = picked;
      const ext = asset.name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? '';
      if (ext && ext !== 'json') {
        return { ok: false, code: 'unsupported' };
      }

      let definition: ViolinSongDefinition & { artist?: string };
      try {
        const file = new File(asset.uri);
        const text = await file.text();
        definition = parseUserViolinSongJson(text, {
          fallbackTitle: asset.name.replace(/\.json$/i, ''),
        });
      } catch (error) {
        if (error instanceof UserViolinSongParseError) {
          return { ok: false, code: error.code };
        }
        return { ok: false, code: 'readFailed' };
      }

      const userSong = await persistSong(definition, setSongs);
      return { ok: true, song: userSong };
    } catch {
      return { ok: false, code: 'readFailed' };
    } finally {
      setImporting(false);
    }
  }, []);

  const importSongFromJsonText = useCallback(
    async (text: string): Promise<ImportViolinSongResult> => {
      setImporting(true);
      try {
        const definition = parseUserViolinSongJson(text);
        const userSong = await persistSong(definition, setSongs);
        return { ok: true, song: userSong };
      } catch (error) {
        if (error instanceof UserViolinSongParseError) {
          return { ok: false, code: error.code };
        }
        return { ok: false, code: 'invalidJson' };
      } finally {
        setImporting(false);
      }
    },
    [],
  );

  const removeSong = useCallback(async (songId: string) => {
    const next = await deleteUserViolinSong(songId);
    setSongs(next);
  }, []);

  return {
    songs,
    loading,
    importing,
    importSong,
    importSongFromJsonText,
    removeSong,
  };
}
