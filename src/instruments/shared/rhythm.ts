// Transcriptions here have been written against hand-rolled `Q` / `E` / `S`
// constants, which quietly limits every chart to straight duple subdivisions:
// no triplets, no dotted values, no asymmetric bars. Turkish repertoire in
// particular lives in aksak meters (9/8 as 2+2+2+3), and snapping those onto
// an even grid changes the tune's identity more than a wrong note would.
//
// A grid built from a tempo keeps the arithmetic in one place and makes the
// awkward values — triplets, dots, uneven bars — as easy to write as the
// straight ones.

export type RhythmGrid = {
  /** Beats per minute the grid was built from. */
  bpm: number;
  wholeMs: number;
  halfMs: number;
  quarterMs: number;
  eighthMs: number;
  sixteenthMs: number;
  /** Units making up one bar — even meters are [1,1,1,1] of a quarter. */
  beatsPerBar: number;
  barMs: number;
  /** 1.5× a value — a dotted note. */
  dotted: (valueMs: number) => number;
  /** One note of a triplet filling `valueMs`. */
  triplet: (valueMs: number) => number;
  /** Start of a bar (0-based) on the chart timeline. */
  bar: (index: number) => number;
  /** A position inside a bar, in beats (may be fractional) plus an offset. */
  at: (barIndex: number, beat?: number, offsetMs?: number) => number;
  /** Start of an aksak group (0-based) inside a bar. */
  group: (barIndex: number, groupIndex: number, offsetMs?: number) => number;
};

export type GridOptions = {
  /** Quarter-note tempo. */
  bpm: number;
  /** Beats in a bar for even meters. Ignored when `groups` is given. */
  beatsPerBar?: number;
  /**
   * Asymmetric bar written as unit counts — 9/8 aksak is [2, 2, 2, 3]. The
   * unit is `unit` (an eighth by default), so the bar is 9 eighths long but
   * its stresses fall at 0, 2, 4 and 6 rather than every three.
   */
  groups?: number[];
  /** Note value one `groups` entry counts in. Defaults to an eighth. */
  unit?: 'quarter' | 'eighth' | 'sixteenth';
};

export function createGrid(options: GridOptions): RhythmGrid {
  const quarterMs = 60_000 / options.bpm;
  const eighthMs = quarterMs / 2;
  const sixteenthMs = quarterMs / 4;

  const unitMs =
    options.unit === 'quarter'
      ? quarterMs
      : options.unit === 'sixteenth'
        ? sixteenthMs
        : eighthMs;

  const groups = options.groups;
  const beatsPerBar = options.beatsPerBar ?? 4;
  const barMs = groups
    ? groups.reduce((sum, count) => sum + count, 0) * unitMs
    : beatsPerBar * quarterMs;

  const bar = (index: number): number => index * barMs;

  return {
    bpm: options.bpm,
    wholeMs: quarterMs * 4,
    halfMs: quarterMs * 2,
    quarterMs,
    eighthMs,
    sixteenthMs,
    beatsPerBar: groups ? groups.length : beatsPerBar,
    barMs,
    dotted: (valueMs: number) => valueMs * 1.5,
    triplet: (valueMs: number) => valueMs / 3,
    bar,
    at: (barIndex: number, beat = 0, offsetMs = 0) =>
      bar(barIndex) + beat * quarterMs + offsetMs,
    group: (barIndex: number, groupIndex: number, offsetMs = 0) => {
      if (!groups) {
        return bar(barIndex) + groupIndex * quarterMs + offsetMs;
      }
      let units = 0;
      for (let i = 0; i < groupIndex && i < groups.length; i++) {
        units += groups[i];
      }
      return bar(barIndex) + units * unitMs + offsetMs;
    },
  };
}

/** Beat positions (in units) where an aksak bar takes its stress. */
export function groupStresses(groups: number[]): number[] {
  const stresses: number[] = [];
  let units = 0;
  for (const count of groups) {
    stresses.push(units);
    units += count;
  }
  return stresses;
}
