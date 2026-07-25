import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';
import { BILLIE_JEAN_EVENTS } from './billieJeanEvents';

// q=114 → 526ms; the generated chart is exactly eight eighths to the bar.
const Q = 526;
const BAR = 4 * Q;

const LAST_MS = BILLIE_JEAN_EVENTS[BILLIE_JEAN_EVENTS.length - 1]?.atMs ?? 0;

/**
 * Chord root per bar of the chart, in F#m. The groove bars are the song's own
 * bass figure (F#-C#-E-F#-E-C#-B-C#) so they take F#m outright; the bars where
 * that figure is restated a fourth up (B-F#-A-B-A-F#-E-F#) take Bm; the hook
 * bars alternate F#m with the A and Bm the line spells on the beat; the
 * keyboard section turns on D where the phrase drops from D; and the G# bar
 * before the groove returns is the C# dominant that leads back into it.
 */
const BAR_ROOTS: NoteId[] = [
  // Bass groove intro (12 bars)
  'Gb4', 'Gb4', 'Gb4', 'Gb4', 'Gb4', 'Gb4',
  'Gb4', 'Gb4', 'Gb4', 'Gb4', 'Gb4', 'Gb4',
  // Groove a fourth up, then back
  'B4', 'B4', 'Gb4', 'Gb4',
  // Vocal hook
  'Gb4', 'B4', 'Gb4', 'A4', 'B4', 'Gb4', 'A4', 'Gb4',
  // Groove / fourth up / groove
  'Gb4', 'Gb4', 'B4', 'B4', 'Gb4', 'Gb4',
  // Vocal hook
  'Gb4', 'B4', 'Gb4', 'A4', 'B4', 'Gb4', 'A4', 'Gb4',
  // Keyboard section — D against F#m
  'D4', 'Gb4', 'D4', 'Gb4', 'D4', 'Gb4', 'D4', 'Gb4',
  // The held G# and its C# — dominant back into the groove
  'Db4', 'Db4',
  'Gb4', 'Gb4',
  // Vocal hook
  'Gb4', 'B4', 'Gb4', 'A4', 'B4', 'Gb4', 'A4', 'Gb4',
  // Groove out
  'Gb4', 'Gb4',
];

/**
 * Root on beats 1 and 3. Written on the keyboard and sounded an octave down —
 * the chart's own bass figure already sits in the melody's octaves, so the
 * accompaniment has to go under it rather than beside it.
 */
const BASS: SongEvent[] = BAR_ROOTS.flatMap((noteId, barIndex) =>
  [0, 2].map((beat) => ({
    noteId,
    atMs: barIndex * BAR + beat * Q,
    durationMs: 2 * Q,
    role: 'accompaniment' as const,
    transpose: -12,
  })),
);

const EVENTS: SongEvent[] = [...BILLIE_JEAN_EVENTS, ...BASS].sort(
  (a, b) => a.atMs - b.atMs,
);

// "Bir kısmı": first vocal chorus (~50 notes), 0-based indices 128–177.
// Counted over the tune — the bass runs underneath the whole excerpt.
const PARTIAL_START_INDEX = 128;
const PARTIAL_END_INDEX = 177;
const partialFirst = BILLIE_JEAN_EVENTS[PARTIAL_START_INDEX];
const partialLast = BILLIE_JEAN_EVENTS[PARTIAL_END_INDEX];

export const billieJeanSong: SongDefinition = {
  id: 'billie-jean',
  title: 'Billie Jean',
  artist: 'Michael Jackson',
  descriptionKey: 'tutorial.songs.billieJean.description',
  previewDurationMs: Math.min(12000, LAST_MS + 500),
  events: EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs:
    partialFirst && partialLast
      ? {
          startMs: partialFirst.atMs,
          endMs: partialLast.atMs,
        }
      : undefined,
};
