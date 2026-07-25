import type { SongMeter } from '../../piano/songs/types';
import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * Greensleeves — anonymous Renaissance melody. 6/8 lilt in A minor,
 * G# leading tones from the E-major cadences.
 */
const BEAT = 500;

/** Strain A — "Alas, my love…" (melody rises to F, falls to the cadence). */
function strainA(startMs: number, finalTonic: boolean): GuitarSongEvent[] {
  const cadence = finalTonic
    ? [
        // …G#–A close on the tonic.
        note('s3', 1, startMs + BEAT * 13),
        note('s3', 2, startMs + BEAT * 14),
      ]
    : [
        // …B–G#–E open cadence.
        note('s2', 0, startMs + BEAT * 12),
        note('s3', 1, startMs + BEAT * 13),
        note('s4', 2, startMs + BEAT * 14),
      ];

  return [
    note('s3', 2, startMs),
    note('s2', 1, startMs + BEAT),
    note('s2', 3, startMs + BEAT * 2),
    note('s1', 0, startMs + BEAT * 3),
    note('s1', 1, startMs + BEAT * 3.5),
    note('s1', 0, startMs + BEAT * 4),
    note('s2', 3, startMs + BEAT * 5),
    note('s2', 0, startMs + BEAT * 6),
    note('s3', 0, startMs + BEAT * 6.5),
    note('s3', 2, startMs + BEAT * 7),
    note('s2', 0, startMs + BEAT * 8),
    note('s2', 1, startMs + BEAT * 9),
    note('s3', 2, startMs + BEAT * 10),
    note('s3', 1, startMs + BEAT * 10.5),
    note('s3', 2, startMs + BEAT * 11),
    ...cadence,
  ];
}

/** Strain B — "Greensleeves was all my joy…" (starts on the high G). */
function strainB(startMs: number, finalTonic: boolean): GuitarSongEvent[] {
  const cadence = finalTonic
    ? [
        note('s3', 1, startMs + BEAT * 12),
        note('s3', 2, startMs + BEAT * 13),
      ]
    : [
        note('s2', 0, startMs + BEAT * 12),
        note('s3', 1, startMs + BEAT * 13),
        note('s4', 2, startMs + BEAT * 14),
      ];

  return [
    note('s1', 3, startMs),
    note('s1', 3, startMs + BEAT * 2),
    note('s1', 2, startMs + BEAT * 3),
    note('s1', 0, startMs + BEAT * 4),
    note('s2', 3, startMs + BEAT * 5),
    note('s2', 0, startMs + BEAT * 6),
    note('s3', 0, startMs + BEAT * 6.5),
    note('s3', 2, startMs + BEAT * 7),
    note('s2', 0, startMs + BEAT * 8),
    note('s2', 1, startMs + BEAT * 9),
    note('s3', 2, startMs + BEAT * 10),
    note('s3', 1, startMs + BEAT * 10.5),
    note('s3', 2, startMs + BEAT * 11),
    ...cadence,
  ];
}

const STRAIN_MS = BEAT * 16;

export const GREENSLEEVES_EVENTS: GuitarSongEvent[] = [
  e('chord:Am', 0),
  ...strainA(BEAT, false),
  e('chord:E', STRAIN_MS),
  ...strainA(STRAIN_MS + BEAT, true),
  e('chord:C', STRAIN_MS * 2),
  ...strainB(STRAIN_MS * 2 + BEAT, false),
  e('chord:G', STRAIN_MS * 3),
  ...strainB(STRAIN_MS * 3 + BEAT, true),
  e('chord:Am', STRAIN_MS * 4),
];

/** Four beats to the bar; a strain is exactly sixteen. */
export const GREENSLEEVES_METER: SongMeter = { beatMs: BEAT, beatsPerBar: 4 };

/** Chord + strain A's first phrase. */
export const GREENSLEEVES_PARTIAL_COUNT = 11;
