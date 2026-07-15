import type { NoteId } from '../pianoNotes';

export type SongEvent = {
  noteId: NoteId;
  atMs: number;
};

export type SongBackingTrack = {
  /**
   * Metro `require()` asset module id for a bundled MP3/M4A
   * (royalty-free / owned assets only).
   */
  module?: number;
  /** Local file URI — user-provided original mix for Band Mode. */
  uri?: string;
  /**
   * Local file URI — user-provided "piano-less" stem/karaoke track.
   * When present the backing player uses this instead of `uri` so
   * the user's live piano replaces the original piano part.
   */
  pianoLessUri?: string;
  /**
   * Audio timeline position (ms) where `events[0]` should align.
   * Calibrate per user’s file (intros / silence differ).
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
  /** Present when a full-mix backing track is available for Band Mode. */
  backingTrack?: SongBackingTrack;
  /**
   * Audio-timeline window used for "partial" scope.
   * Defaults to the piano events span when omitted.
   */
  partialWindowMs?: SongPartialWindow;
};

/** How hard the chart is to play on the piano (not support level). */
export type SongDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Catalog entry: every song we plan to offer. `song` is null until the
 * melody has been transcribed — shown as "coming soon" in the UI.
 */
export type CatalogSong = {
  id: string;
  title: string;
  artist: string;
  /** Playability: easy / medium / hard for the song list filter. */
  difficulty: SongDifficulty;
  song: SongDefinition | null;
};

/** Band Mode wizard: piano-only vs full mix backing. */
export type PlayMode = 'piano' | 'fullBand';

/** Band Mode wizard: excerpt vs whole track. */
export type SongScope = 'partial' | 'full';

/** True when backing can actually be played (local URI, pianoLessUri, or bundled module). */
export function songHasBackingAudio(
  track: SongBackingTrack | null | undefined,
): boolean {
  if (!track) {
    return false;
  }
  if (typeof track.pianoLessUri === 'string' && track.pianoLessUri.length > 0) {
    return true;
  }
  if (typeof track.uri === 'string' && track.uri.length > 0) {
    return true;
  }
  return typeof track.module === 'number';
}
