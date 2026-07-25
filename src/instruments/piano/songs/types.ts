import type { NoteId } from '../pianoNotes';
import type { SongRole } from '../../shared/songPerformance';

export type SongEvent = {
  noteId: NoteId;
  atMs: number;
  /**
   * How long the note is held. Omit and it is derived from the gap to the next
   * note in the same voice — which is what turns a written half note back into
   * a half note instead of a short note followed by silence.
   */
  durationMs?: number;
  /** 0..1 strike strength. Omit for an accent derived from `meter`. */
  velocity?: number;
  /**
   * Accompaniment is played but never highlighted or scored — the user still
   * only plays the tune. Omit for 'melody'.
   */
  role?: SongRole;
  /**
   * Semitones away from the written pitch when sounding. The keyboard is two
   * octaves wide, so an accompaniment is written on it and sent an octave down
   * (`-12`) to sit under the tune instead of fighting it for the same keys.
   */
  transpose?: number;
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

/**
 * Where the beat falls, so notes can be weighted by their position in the bar.
 * Without it every note is struck equally hard and the tune loses its shape.
 */
export type SongMeter = {
  /** One beat in ms. */
  beatMs: number;
  /** 4 for 4/4, 3 for 3/4, 9 for a 9/8 aksak count. Defaults to 4. */
  beatsPerBar?: number;
  /** Beats carrying a secondary stress (0-based); derived when omitted. */
  strongBeats?: number[];
  /** Where beat 0 of the first bar sits. Defaults to 0. */
  barStartMs?: number;
};

export type SongDefinition = {
  id: string;
  /** Display title — song titles are proper names, not translated. */
  title: string;
  artist?: string;
  descriptionKey?: string;
  previewDurationMs: number;
  events: SongEvent[];
  /** Enables metrical accents; charts without it still get phrase shaping. */
  meter?: SongMeter;
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
