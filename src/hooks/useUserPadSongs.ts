import { useCallback, useEffect, useState } from 'react';
import { File } from 'expo-file-system';

import { parseMidiToPadSong } from '../instruments/pads/songs/midiToPadSong';
import type { PadSongDefinition } from '../instruments/pads/songs/types';
import {
  parseUserPadSongJson,
  UserPadSongParseError,
  type UserPadSongParseErrorCode,
} from '../instruments/pads/songs/userPadSongSchema';
import {
  deleteUserPadSong,
  loadUserPadSongs,
  saveUserPadSong,
  type UserPadSong,
  type UserPadSongSource,
} from '../storage/userPadSongsStorage';
import { pickChartDocument } from '../utils/documentPicker';

export type ImportPadSongResult =
  | { ok: true; song: UserPadSong }
  | {
      ok: false;
      code: UserPadSongParseErrorCode | 'canceled' | 'pickerUnavailable';
    };

function extensionOf(name: string): string {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? '';
}

function detectSource(fileName: string, mimeType?: string | null): UserPadSongSource | null {
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
  definition: PadSongDefinition & { artist?: string },
  source: UserPadSongSource,
  setSongs: (songs: UserPadSong[]) => void,
): Promise<UserPadSong> {
  const userSong: UserPadSong = {
    ...definition,
    source,
    importedAt: Date.now(),
  };
  const next = await saveUserPadSong(userSong);
  setSongs(next);
  return userSong;
}

export function useUserPadSongs() {
  const [songs, setSongs] = useState<UserPadSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadUserPadSongs();
      if (!cancelled) {
        setSongs(loaded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const importSong = useCallback(async (): Promise<ImportPadSongResult> => {
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
      let definition: PadSongDefinition & { artist?: string };
      try {
        if (source === 'json') {
          const text = await file.text();
          definition = parseUserPadSongJson(text, {
            fallbackTitle: asset.name.replace(/\.json$/i, ''),
          });
        } else {
          const bytes = await file.bytes();
          definition = parseMidiToPadSong(bytes, { fileName: asset.name });
        }
      } catch (error) {
        if (error instanceof UserPadSongParseError) {
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
    async (text: string): Promise<ImportPadSongResult> => {
      setImporting(true);
      try {
        const definition = parseUserPadSongJson(text);
        const userSong = await persistSong(definition, 'json', setSongs);
        return { ok: true, song: userSong };
      } catch (error) {
        if (error instanceof UserPadSongParseError) {
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
    const next = await deleteUserPadSong(songId);
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
