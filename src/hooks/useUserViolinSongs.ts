import { useCallback, useEffect, useState } from 'react';
import { File } from 'expo-file-system';

import { parseMidiToViolinSong } from '../instruments/violin/songs/midiToViolinSong';
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
  type UserViolinSongSource,
} from '../storage/userViolinSongsStorage';
import { pickChartDocument } from '../utils/documentPicker';

export type ImportViolinSongResult =
  | { ok: true; song: UserViolinSong }
  | {
      ok: false;
      code: UserViolinSongParseErrorCode | 'canceled' | 'pickerUnavailable';
    };

function extensionOf(name: string): string {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? '';
}

function detectSource(fileName: string, mimeType?: string | null): UserViolinSongSource | null {
  const ext = extensionOf(fileName);
  if (ext === 'json' || mimeType === 'application/json') {
    return 'json';
  }
  if (
    ext === 'mid' ||
    ext === 'midi' ||
    mimeType === 'audio/midi' ||
    mimeType === 'audio/mid' ||
    mimeType === 'audio/x-midi'
  ) {
    return 'midi';
  }
  return null;
}

async function persistSong(
  definition: ViolinSongDefinition & { artist?: string },
  source: UserViolinSongSource,
  setSongs: (songs: UserViolinSong[]) => void,
): Promise<UserViolinSong> {
  const userSong: UserViolinSong = {
    ...definition,
    source,
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
      const picked = await pickChartDocument();
      if (!picked.ok) {
        return { ok: false, code: picked.code };
      }

      const { asset } = picked;
      const source = detectSource(asset.name, asset.mimeType);
      if (!source) {
        return { ok: false, code: 'unsupported' };
      }

      const file = new File(asset.uri);
      let definition: ViolinSongDefinition & { artist?: string };
      try {
        if (source === 'json') {
          const text = await file.text();
          definition = parseUserViolinSongJson(text, {
            fallbackTitle: asset.name.replace(/\.json$/i, ''),
          });
        } else {
          const bytes = await file.bytes();
          definition = parseMidiToViolinSong(bytes, { fileName: asset.name });
        }
      } catch (error) {
        if (error instanceof UserViolinSongParseError) {
          return { ok: false, code: error.code };
        }
        return { ok: false, code: 'readFailed' };
      }

      const userSong = await persistSong(definition, source, setSongs);
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
        const userSong = await persistSong(definition, 'json', setSongs);
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
