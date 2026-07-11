import { useCallback, useEffect, useState } from 'react';
import { File } from 'expo-file-system';

import { parseMidiToSong } from '../instruments/piano/songs/midiToSong';
import {
  parseUserSongJson,
  UserSongParseError,
  type UserSongParseErrorCode,
} from '../instruments/piano/songs/userSongSchema';
import {
  deleteUserSong,
  loadUserSongs,
  saveUserSong,
  type UserSong,
  type UserSongSource,
} from '../storage/userSongsStorage';

export type ImportSongResult =
  | { ok: true; song: UserSong }
  | { ok: false; code: UserSongParseErrorCode | 'canceled' | 'pickerUnavailable' };

type PickedAsset = {
  name: string;
  uri: string;
  mimeType?: string | null;
};

function extensionOf(name: string): string {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? '';
}

function detectSource(fileName: string, mimeType?: string | null): UserSongSource | null {
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

/**
 * Lazy-load DocumentPicker so missing native module does not crash app startup
 * (common when expo-dev-client was built before expo-document-picker was added).
 */
async function pickDocument(): Promise<
  | { ok: true; asset: PickedAsset }
  | { ok: false; code: 'canceled' | 'pickerUnavailable' }
> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DocumentPicker = require('expo-document-picker') as typeof import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/json',
        'audio/midi',
        'audio/mid',
        'audio/x-midi',
        '*/*',
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { ok: false, code: 'canceled' };
    }

    const asset = result.assets[0];
    return {
      ok: true,
      asset: {
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
      },
    };
  } catch {
    return { ok: false, code: 'pickerUnavailable' };
  }
}

async function persistSong(
  definition: ReturnType<typeof parseUserSongJson>,
  source: UserSongSource,
  setSongs: (songs: UserSong[]) => void,
): Promise<UserSong> {
  const userSong: UserSong = {
    ...definition,
    source,
    importedAt: Date.now(),
  };
  const next = await saveUserSong(userSong);
  setSongs(next);
  return userSong;
}

export function useUserSongs() {
  const [songs, setSongs] = useState<UserSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadUserSongs();
      if (!cancelled) {
        setSongs(loaded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const importSong = useCallback(async (): Promise<ImportSongResult> => {
    setImporting(true);
    try {
      const picked = await pickDocument();
      if (!picked.ok) {
        return { ok: false, code: picked.code };
      }

      const { asset } = picked;
      const source = detectSource(asset.name, asset.mimeType);
      if (!source) {
        return { ok: false, code: 'unsupported' };
      }

      const file = new File(asset.uri);
      let definition;
      try {
        if (source === 'json') {
          const text = await file.text();
          definition = parseUserSongJson(text, {
            fallbackTitle: asset.name.replace(/\.json$/i, ''),
          });
        } else {
          const bytes = await file.bytes();
          definition = parseMidiToSong(bytes, { fileName: asset.name });
        }
      } catch (error) {
        if (error instanceof UserSongParseError) {
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

  /** Import from pasted / typed JSON text — works without DocumentPicker native module. */
  const importSongFromJsonText = useCallback(
    async (text: string): Promise<ImportSongResult> => {
      setImporting(true);
      try {
        const definition = parseUserSongJson(text);
        const userSong = await persistSong(definition, 'json', setSongs);
        return { ok: true, song: userSong };
      } catch (error) {
        if (error instanceof UserSongParseError) {
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
    const next = await deleteUserSong(songId);
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
