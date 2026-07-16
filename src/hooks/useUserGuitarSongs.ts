import { useCallback, useEffect, useState } from 'react';
import { File } from 'expo-file-system';

import { parseMidiToGuitarSong } from '../instruments/guitar/songs/midiToGuitarSong';
import type { GuitarSongDefinition } from '../instruments/guitar/songs/types';
import {
  parseUserGuitarSongJson,
  UserGuitarSongParseError,
  type UserGuitarSongParseErrorCode,
} from '../instruments/guitar/songs/userGuitarSongSchema';
import {
  deleteUserGuitarSong,
  loadUserGuitarSongs,
  saveUserGuitarSong,
  type UserGuitarSong,
  type UserGuitarSongSource,
} from '../storage/userGuitarSongsStorage';
import { pickChartDocument } from '../utils/documentPicker';

export type ImportGuitarSongResult =
  | { ok: true; song: UserGuitarSong }
  | {
      ok: false;
      code: UserGuitarSongParseErrorCode | 'canceled' | 'pickerUnavailable';
    };

function extensionOf(name: string): string {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? '';
}

function detectSource(fileName: string, mimeType?: string | null): UserGuitarSongSource | null {
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
  definition: GuitarSongDefinition & { artist?: string },
  source: UserGuitarSongSource,
  setSongs: (songs: UserGuitarSong[]) => void,
): Promise<UserGuitarSong> {
  const userSong: UserGuitarSong = {
    ...definition,
    source,
    importedAt: Date.now(),
  };
  const next = await saveUserGuitarSong(userSong);
  setSongs(next);
  return userSong;
}

export function useUserGuitarSongs() {
  const [songs, setSongs] = useState<UserGuitarSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadUserGuitarSongs();
      if (!cancelled) {
        setSongs(loaded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const importSong = useCallback(async (): Promise<ImportGuitarSongResult> => {
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
      let definition: GuitarSongDefinition & { artist?: string };
      try {
        if (source === 'json') {
          const text = await file.text();
          definition = parseUserGuitarSongJson(text, {
            fallbackTitle: asset.name.replace(/\.json$/i, ''),
          });
        } else {
          const bytes = await file.bytes();
          definition = parseMidiToGuitarSong(bytes, { fileName: asset.name });
        }
      } catch (error) {
        if (error instanceof UserGuitarSongParseError) {
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
    async (text: string): Promise<ImportGuitarSongResult> => {
      setImporting(true);
      try {
        const definition = parseUserGuitarSongJson(text);
        const userSong = await persistSong(definition, 'json', setSongs);
        return { ok: true, song: userSong };
      } catch (error) {
        if (error instanceof UserGuitarSongParseError) {
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
    const next = await deleteUserGuitarSong(songId);
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
