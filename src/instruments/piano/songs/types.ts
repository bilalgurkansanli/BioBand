import type { NoteId } from '../pianoNotes';

export type SongEvent = {
  noteId: NoteId;
  atMs: number;
};

export type SongDefinition = {
  id: string;
  /** Display title — song titles are proper names, not translated. */
  title: string;
  artist?: string;
  descriptionKey?: string;
  previewDurationMs: number;
  events: SongEvent[];
};

/**
 * Catalog entry: every song we plan to offer. `song` is null until the
 * melody has been transcribed — shown as "coming soon" in the UI.
 */
export type CatalogSong = {
  id: string;
  title: string;
  artist: string;
  song: SongDefinition | null;
};
