import { useCallback, useEffect, useState } from 'react';
import { File } from 'expo-file-system';

import { parseMidiToSong } from '../instruments/piano/songs/midiToSong';
import {
  parseUserSongJson,
  UserSongParseError,
  type UserSongParseErrorCode,
} from '../instruments/piano/songs/userSongSchema';
import type { SongDefinition } from '../instruments/piano/songs/types';
import {
  copySongAudioFile,
  saveSongAudioBinding,
} from '../storage/songAudioBindingsStorage';
import {
  deleteUserSong,
  loadUserSongs,
  saveUserSong,
  type UserSong,
  type UserSongSource,
} from '../storage/userSongsStorage';
import {
  pickAudioDocument,
  pickChartDocument,
} from '../utils/documentPicker';

export type ImportSongResult =
  | { ok: true; song: UserSong }
  | {
      ok: false;
      code: UserSongParseErrorCode | 'canceled' | 'pickerUnavailable';
    };

export type AttachAudioResult =
  | { ok: true; song: UserSong }
  | {
      ok: false;
      code: 'canceled' | 'pickerUnavailable' | 'unsupported' | 'readFailed' | 'notFound';
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

async function attachAudioToDefinition(
  definition: SongDefinition,
  audioUri: string,
  fileNameHint?: string,
): Promise<SongDefinition> {
  const localUri = copySongAudioFile(definition.id, audioUri, fileNameHint);
  const eventsStartMs = 0;
  await saveSongAudioBinding({
    songId: definition.id,
    localUri,
    eventsStartMs,
  });
  return {
    ...definition,
    backingTrack: {
      uri: localUri,
      eventsStartMs,
    },
  };
}

async function persistSong(
  definition: SongDefinition,
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

  /** Import chart only (JSON/MIDI). Attach Band Mode audio separately. */
  const importSong = useCallback(async (): Promise<ImportSongResult> => {
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
      let definition: SongDefinition;
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

  /** Import from pasted / typed JSON text — works without DocumentPicker. */
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

  /** Pick an original-mix file and attach it to an existing user song. */
  const attachAudioToUserSong = useCallback(
    async (songId: string): Promise<AttachAudioResult> => {
      const existing = songs.find((song) => song.id === songId);
      if (!existing) {
        return { ok: false, code: 'notFound' };
      }

      setImporting(true);
      try {
        const picked = await pickAudioDocument();
        if (!picked.ok) {
          return { ok: false, code: picked.code };
        }

        const withAudio = await attachAudioToDefinition(
          existing,
          picked.asset.uri,
          picked.asset.name,
        );
        const userSong: UserSong = {
          ...existing,
          ...withAudio,
          source: existing.source,
          importedAt: existing.importedAt,
        };
        const next = await saveUserSong(userSong);
        setSongs(next);
        return { ok: true, song: userSong };
      } catch {
        return { ok: false, code: 'readFailed' };
      } finally {
        setImporting(false);
      }
    },
    [songs],
  );

  const updateUserSongBackingOffset = useCallback(
    async (songId: string, eventsStartMs: number): Promise<void> => {
      const existing = songs.find((song) => song.id === songId);
      if (!existing?.backingTrack) {
        return;
      }
      const userSong: UserSong = {
        ...existing,
        backingTrack: {
          ...existing.backingTrack,
          eventsStartMs,
        },
      };
      const next = await saveUserSong(userSong);
      setSongs(next);
    },
    [songs],
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
    attachAudioToUserSong,
    updateUserSongBackingOffset,
    removeSong,
  };
}
