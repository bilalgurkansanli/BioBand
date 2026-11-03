import { parseMidiToGuitarSong } from '../instruments/guitar/songs/midiToGuitarSong';
import type { GuitarSongDefinition } from '../instruments/guitar/songs/types';
import {
  parseUserGuitarSongJson,
  UserGuitarSongParseError,
  type UserGuitarSongParseErrorCode,
} from '../instruments/guitar/songs/userGuitarSongSchema';
import {
  useUserSongLibrary,
  type ImportUserSongResult,
  type UserSongLibraryAdapter,
} from '../playAlong/useUserSongLibrary';
import {
  deleteUserGuitarSong,
  loadUserGuitarSongs,
  saveUserGuitarSong,
  type UserGuitarSong,
} from '../storage/userGuitarSongsStorage';

export type ImportGuitarSongResult = ImportUserSongResult<
  UserGuitarSong,
  UserGuitarSongParseErrorCode
>;

const LIBRARY: UserSongLibraryAdapter<
  UserGuitarSong,
  GuitarSongDefinition & { artist?: string },
  UserGuitarSongParseErrorCode
> = {
  load: loadUserGuitarSongs,
  save: saveUserGuitarSong,
  remove: deleteUserGuitarSong,
  parseJson: parseUserGuitarSongJson,
  parseMidi: parseMidiToGuitarSong,
  errorCode: (error) => (error instanceof UserGuitarSongParseError ? error.code : null),
  stamp: (definition, source, importedAt) => ({ ...definition, source, importedAt }),
};

export function useUserGuitarSongs() {
  const { songs, loading, importing, importSong, importSongFromJsonText, removeSong } =
    useUserSongLibrary(LIBRARY);
  return { songs, loading, importing, importSong, importSongFromJsonText, removeSong };
}
