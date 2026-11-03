import { parseMidiToViolinSong } from '../instruments/violin/songs/midiToViolinSong';
import type { ViolinSongDefinition } from '../instruments/violin/songs/types';
import {
  parseUserViolinSongJson,
  UserViolinSongParseError,
  type UserViolinSongParseErrorCode,
} from '../instruments/violin/songs/userViolinSongSchema';
import {
  useUserSongLibrary,
  type ImportUserSongResult,
  type UserSongLibraryAdapter,
} from '../playAlong/useUserSongLibrary';
import {
  deleteUserViolinSong,
  loadUserViolinSongs,
  saveUserViolinSong,
  type UserViolinSong,
} from '../storage/userViolinSongsStorage';

export type ImportViolinSongResult = ImportUserSongResult<
  UserViolinSong,
  UserViolinSongParseErrorCode
>;

const LIBRARY: UserSongLibraryAdapter<
  UserViolinSong,
  ViolinSongDefinition & { artist?: string },
  UserViolinSongParseErrorCode
> = {
  load: loadUserViolinSongs,
  save: saveUserViolinSong,
  remove: deleteUserViolinSong,
  parseJson: parseUserViolinSongJson,
  parseMidi: parseMidiToViolinSong,
  errorCode: (error) => (error instanceof UserViolinSongParseError ? error.code : null),
  stamp: (definition, source, importedAt) => ({ ...definition, source, importedAt }),
};

export function useUserViolinSongs() {
  const { songs, loading, importing, importSong, importSongFromJsonText, removeSong } =
    useUserSongLibrary(LIBRARY);
  return { songs, loading, importing, importSong, importSongFromJsonText, removeSong };
}
