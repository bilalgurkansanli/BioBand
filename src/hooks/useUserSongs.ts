import { useCallback } from 'react';

import { parseMidiToSong } from '../instruments/piano/songs/midiToSong';
import {
  parseUserSongJson,
  UserSongParseError,
  type UserSongParseErrorCode,
} from '../instruments/piano/songs/userSongSchema';
import type { SongDefinition } from '../instruments/piano/songs/types';
import {
  useUserSongLibrary,
  type ImportUserSongResult,
  type UserSongLibraryAdapter,
} from '../playAlong/useUserSongLibrary';
import {
  copySongAudioFile,
  saveSongAudioBinding,
} from '../storage/songAudioBindingsStorage';
import {
  deleteUserSong,
  loadUserSongs,
  saveUserSong,
  type UserSong,
} from '../storage/userSongsStorage';
import { pickBackingAudioDocument } from '../utils/documentPicker';

export type ImportSongResult = ImportUserSongResult<UserSong, UserSongParseErrorCode>;

export type AttachAudioResult =
  | { ok: true; song: UserSong }
  | {
      ok: false;
      code: 'canceled' | 'pickerUnavailable' | 'unsupported' | 'readFailed' | 'notFound';
    };

const LIBRARY: UserSongLibraryAdapter<UserSong, SongDefinition, UserSongParseErrorCode> = {
  load: loadUserSongs,
  save: saveUserSong,
  remove: deleteUserSong,
  parseJson: parseUserSongJson,
  parseMidi: parseMidiToSong,
  errorCode: (error) => (error instanceof UserSongParseError ? error.code : null),
  stamp: (definition, source, importedAt) => ({ ...definition, source, importedAt }),
};

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

export function useUserSongs() {
  const {
    songs,
    setSongs,
    loading,
    importing,
    setImporting,
    importSong,
    importSongFromJsonText,
    removeSong,
  } = useUserSongLibrary(LIBRARY);

  /** Pick an original-mix file and attach it to an existing user song. */
  const attachAudioToUserSong = useCallback(
    async (songId: string): Promise<AttachAudioResult> => {
      const existing = songs.find((song) => song.id === songId);
      if (!existing) {
        return { ok: false, code: 'notFound' };
      }

      setImporting(true);
      try {
        // Audio only: this replaces the song's backing track, and a MIDI or
        // JSON pick would overwrite a working track with something the player
        // cannot decode.
        const picked = await pickBackingAudioDocument();
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
    [setImporting, setSongs, songs],
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
    [setSongs, songs],
  );

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
