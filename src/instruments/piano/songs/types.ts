import type { NoteId } from '../pianoNotes';

export type SongEvent = {
  noteId: NoteId;
  atMs: number;
};

export type SongDefinition = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  previewDurationMs: number;
  events: SongEvent[];
};
