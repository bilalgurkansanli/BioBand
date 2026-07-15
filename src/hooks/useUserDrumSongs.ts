import { useCallback, useEffect, useState } from 'react';
import { File } from 'expo-file-system';

import { parseMidiToDrumSong } from '../instruments/drums/songs/midiToDrumSong';
import type { DrumSongDefinition } from '../instruments/drums/songs/types';
import {
  parseUserDrumSongJson,
  UserDrumSongParseError,
  type UserDrumSongParseErrorCode,
} from '../instruments/drums/songs/userDrumSongSchema';
import {
  deleteUserDrumSong,
  loadUserDrumSongs,
  saveUserDrumSong,
  type UserDrumSong,
  type UserDrumSongSource,
} from '../storage/userDrumSongsStorage';
import { pickChartDocument } from '../utils/documentPicker';

export type ImportDrumSongResult =
  | { ok: true; song: UserDrumSong }
  | {
      ok: false;
      code: UserDrumSongParseErrorCode | 'canceled' | 'pickerUnavailable';
    };

function extensionOf(name: string): string {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? '';
}

function detectSource(fileName: string, mimeType?: string | null): UserDrumSongSource | null {
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
  definition: DrumSongDefinition & { artist?: string },
  source: UserDrumSongSource,
  setSongs: (songs: UserDrumSong[]) => void,
): Promise<UserDrumSong> {
  const userSong: UserDrumSong = {
    ...definition,
    source,
    importedAt: Date.now(),
  };
  const next = await saveUserDrumSong(userSong);
  setSongs(next);
  return userSong;
}

export function useUserDrumSongs() {
  const [songs, setSongs] = useState<UserDrumSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadUserDrumSongs();
      if (!cancelled) {
        setSongs(loaded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const importSong = useCallback(async (): Promise<ImportDrumSongResult> => {
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
      let definition: DrumSongDefinition & { artist?: string };
      try {
        if (source === 'json') {
          const text = await file.text();
          definition = parseUserDrumSongJson(text, {
            fallbackTitle: asset.name.replace(/\.json$/i, ''),
          });
        } else {
          const bytes = await file.bytes();
          definition = parseMidiToDrumSong(bytes, { fileName: asset.name });
        }
      } catch (error) {
        if (error instanceof UserDrumSongParseError) {
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
    async (text: string): Promise<ImportDrumSongResult> => {
      setImporting(true);
      try {
        const definition = parseUserDrumSongJson(text);
        const userSong = await persistSong(definition, 'json', setSongs);
        return { ok: true, song: userSong };
      } catch (error) {
        if (error instanceof UserDrumSongParseError) {
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
    const next = await deleteUserDrumSong(songId);
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
