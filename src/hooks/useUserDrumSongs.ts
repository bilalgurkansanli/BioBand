import { parseMidiToDrumSong } from '../instruments/drums/songs/midiToDrumSong';
import type { DrumSongDefinition } from '../instruments/drums/songs/types';
import {
  parseUserDrumSongJson,
  UserDrumSongParseError,
  type UserDrumSongParseErrorCode,
} from '../instruments/drums/songs/userDrumSongSchema';
import {
  useUserSongLibrary,
  type ImportUserSongResult,
  type UserSongLibraryAdapter,
} from '../playAlong/useUserSongLibrary';
import {
  deleteUserDrumSong,
  loadUserDrumSongs,
  saveUserDrumSong,
  type UserDrumSong,
} from '../storage/userDrumSongsStorage';

export type ImportDrumSongResult = ImportUserSongResult<UserDrumSong, UserDrumSongParseErrorCode>;

const LIBRARY: UserSongLibraryAdapter<
  UserDrumSong,
  DrumSongDefinition & { artist?: string },
  UserDrumSongParseErrorCode
> = {
  load: loadUserDrumSongs,
  save: saveUserDrumSong,
  remove: deleteUserDrumSong,
  parseJson: parseUserDrumSongJson,
  parseMidi: parseMidiToDrumSong,
  errorCode: (error) => (error instanceof UserDrumSongParseError ? error.code : null),
  stamp: (definition, source, importedAt) => ({ ...definition, source, importedAt }),
};

export function useUserDrumSongs() {
  const { songs, loading, importing, importSong, importSongFromJsonText, removeSong } =
    useUserSongLibrary(LIBRARY);
  return { songs, loading, importing, importSong, importSongFromJsonText, removeSong };
}
