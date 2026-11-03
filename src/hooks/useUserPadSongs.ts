import { parseMidiToPadSong } from '../instruments/pads/songs/midiToPadSong';
import type { PadSongDefinition } from '../instruments/pads/songs/types';
import {
  parseUserPadSongJson,
  UserPadSongParseError,
  type UserPadSongParseErrorCode,
} from '../instruments/pads/songs/userPadSongSchema';
import {
  useUserSongLibrary,
  type ImportUserSongResult,
  type UserSongLibraryAdapter,
} from '../playAlong/useUserSongLibrary';
import {
  deleteUserPadSong,
  loadUserPadSongs,
  saveUserPadSong,
  type UserPadSong,
} from '../storage/userPadSongsStorage';

export type ImportPadSongResult = ImportUserSongResult<UserPadSong, UserPadSongParseErrorCode>;

const LIBRARY: UserSongLibraryAdapter<
  UserPadSong,
  PadSongDefinition & { artist?: string },
  UserPadSongParseErrorCode
> = {
  load: loadUserPadSongs,
  save: saveUserPadSong,
  remove: deleteUserPadSong,
  parseJson: parseUserPadSongJson,
  parseMidi: parseMidiToPadSong,
  errorCode: (error) => (error instanceof UserPadSongParseError ? error.code : null),
  stamp: (definition, source, importedAt) => ({ ...definition, source, importedAt }),
};

export function useUserPadSongs() {
  const { songs, loading, importing, importSong, importSongFromJsonText, removeSong } =
    useUserSongLibrary(LIBRARY);
  return { songs, loading, importing, importSong, importSongFromJsonText, removeSong };
}
