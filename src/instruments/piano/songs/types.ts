import type { NoteId } from '../pianoNotes';

export type SongEvent = {
  noteId: NoteId;
  atMs: number;
};

export type SongBackingTrack = {
  /** Metro `require()` asset module id for the bundled MP3/M4A. */
  module: number;
  /**
   * Audio timeline position (ms) where `events[0]` should align.
   * Calibrate after dropping the real track.
   */
  eventsStartMs: number;
};

export type SongPartialWindow = {
  /** Inclusive start on the audio timeline (ms). */
  startMs: number;
  /** Inclusive end on the audio timeline (ms). */
  endMs: number;
};

export type SongDefinition = {
  id: string;
  /** Display title — song titles are proper names, not translated. */
  title: string;
  artist?: string;
  descriptionKey?: string;
  previewDurationMs: number;
  events: SongEvent[];
  /** Present when a full-mix backing track is bundled for Band Mode. */
  backingTrack?: SongBackingTrack;
  /**
   * Audio-timeline window used for "partial" scope.
   * Defaults to the piano events span when omitted.
   */
  partialWindowMs?: SongPartialWindow;
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

/** Band Mode wizard: piano-only vs full mix backing. */
export type PlayMode = 'piano' | 'fullBand';

/** Band Mode wizard: excerpt vs whole track. */
export type SongScope = 'partial' | 'full';
