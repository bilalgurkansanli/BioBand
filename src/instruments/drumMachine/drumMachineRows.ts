export const STEP_COUNT_OPTIONS = [8, 9, 12, 16, 18, 32] as const;
export type StepCount = (typeof STEP_COUNT_OPTIONS)[number];
export const STEP_COUNT_DEFAULT: StepCount = 16;

export const BPM_MIN = 60;
export const BPM_MAX = 180;
export const BPM_DEFAULT = 120;

/** Cell levels: 0 = off, 1 = normal hit, 2 = accent. */
export type CellLevel = 0 | 1 | 2;
export type DrumMachineGrid = number[][];

/** Hit strength for a cell level — accents punch, normals sit back. */
export function velocityForLevel(level: number): number {
  return level >= 2 ? 1 : 0.72;
}

export function isStepCount(value: unknown): value is StepCount {
  return (STEP_COUNT_OPTIONS as readonly number[]).includes(value as number);
}

/**
 * Visual/musical beat groups per step count. 9 and 18 are the Turkish aksak
 * 9/8 (2+2+2+3); 12 is a triplet feel; the rest group in fours.
 */
export function stepGroupSizes(stepCount: number): number[] {
  switch (stepCount) {
    case 8:
      return [2, 2, 2, 2];
    case 9:
      return [2, 2, 2, 3];
    case 12:
      return [3, 3, 3, 3];
    case 18:
      return [4, 4, 4, 6];
    default: {
      const groups: number[] = [];
      for (let i = 0; i < stepCount; i += 4) {
        groups.push(Math.min(4, stepCount - i));
      }
      return groups;
    }
  }
}

/** Which beat group a step falls into (for alternating column colors). */
export function stepGroupIndex(stepCount: number, step: number): number {
  const groups = stepGroupSizes(stepCount);
  let start = 0;
  for (let i = 0; i < groups.length; i += 1) {
    start += groups[i];
    if (step < start) {
      return i;
    }
  }
  return groups.length - 1;
}

/** True when the step starts a beat group (metronome clicks land here). */
export function isBeatStep(stepCount: number, step: number): boolean {
  const groups = stepGroupSizes(stepCount);
  let start = 0;
  for (const size of groups) {
    if (step === start) {
      return true;
    }
    start += size;
  }
  return false;
}

export type RandomPatternStyle =
  | 'groove'
  | 'sparse'
  | 'dense'
  | 'offbeat'
  | 'minimal';

const RANDOM_STYLES: RandomPatternStyle[] = [
  'groove',
  'sparse',
  'dense',
  'offbeat',
  'minimal',
];

export function createEmptyGrid(
  rowCount: number,
  stepCount: number = STEP_COUNT_DEFAULT,
): DrumMachineGrid {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: stepCount }, () => 0),
  );
}

export function cloneGrid(grid: DrumMachineGrid): DrumMachineGrid {
  return grid.map((row) => [...row]);
}

/** Resize every row, keeping existing steps where they overlap. */
export function resizeGrid(
  grid: DrumMachineGrid,
  stepCount: number,
): DrumMachineGrid {
  return grid.map((row) =>
    Array.from({ length: stepCount }, (_, step) => row[step] ?? 0),
  );
}

export function pickRandomPatternStyle(): RandomPatternStyle {
  return RANDOM_STYLES[Math.floor(Math.random() * RANDOM_STYLES.length)]!;
}

/** Random BPM snapped to 5, kept in a musical usable range. */
export function createRandomBpm(): number {
  const min = 80;
  const max = 150;
  const raw = min + Math.random() * (max - min);
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(raw / 5) * 5));
}

function densityForStyle(
  style: RandomPatternStyle,
  rowIndex: number,
  rowCount: number,
): number {
  const topHeavy = rowIndex / Math.max(1, rowCount - 1);
  switch (style) {
    case 'sparse':
      return 0.06 + (1 - topHeavy) * 0.08;
    case 'dense':
      return 0.22 + (1 - topHeavy) * 0.18;
    case 'offbeat':
      return 0.1 + (1 - topHeavy) * 0.12;
    case 'minimal':
      return rowIndex === 0 ? 0.2 : rowIndex < 3 ? 0.08 : 0.04;
    case 'groove':
    default:
      return rowIndex === 0 ? 0.28 : rowIndex < 3 ? 0.18 : 0.12;
  }
}

function shouldPlace(
  style: RandomPatternStyle,
  rowIndex: number,
  step: number,
  density: number,
  stepCount: number,
): boolean {
  const onBeat = isBeatStep(stepCount, step);
  if (style === 'groove' && rowIndex === 0) {
    if (step === 0) return true;
    if (onBeat) return Math.random() < 0.7;
    if (step % 4 === 2) return Math.random() < 0.35;
  }
  if (style === 'offbeat') {
    if (step % 2 === 1) return Math.random() < density * 1.6;
    return Math.random() < density * 0.35;
  }
  if (style === 'minimal' && rowIndex === 0) {
    return onBeat && Math.random() < 0.85;
  }
  if (style === 'dense' && rowIndex < 2 && step % 2 === 0) {
    return Math.random() < 0.55;
  }
  // Melodic-friendly: sprinkle ascending steps on mid/high rows
  if (rowIndex >= 3 && step % (rowIndex + 1) === 0) {
    return Math.random() < density * 1.4;
  }
  return Math.random() < density;
}

export function createRandomGrid(
  rowCount: number,
  style: RandomPatternStyle = 'groove',
  stepCount: number = STEP_COUNT_DEFAULT,
): DrumMachineGrid {
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const density = densityForStyle(style, rowIndex, rowCount);
    return Array.from({ length: stepCount }, (_, step) => {
      if (!shouldPlace(style, rowIndex, step, density, stepCount)) {
        return 0;
      }
      // Accent hits that land on a beat (mostly the low rows) now and then.
      const accent =
        isBeatStep(stepCount, step) && rowIndex < 3 && Math.random() < 0.45;
      return accent ? 2 : 1;
    });
  });
}

function isCellValue(cell: unknown): boolean {
  return (
    typeof cell === 'boolean' ||
    (typeof cell === 'number' && Number.isInteger(cell) && cell >= 0 && cell <= 2)
  );
}

/**
 * Accepts both the legacy boolean grids and the velocity grids, any supported
 * step count — every row must share the same length.
 */
export function isValidGrid(value: unknown, expectedRows?: number): value is DrumMachineGrid {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }
  if (expectedRows !== undefined && value.length !== expectedRows) {
    return false;
  }
  const firstRow: unknown = value[0];
  if (!Array.isArray(firstRow) || !isStepCount(firstRow.length)) {
    return false;
  }
  const stepCount = firstRow.length;
  return value.every(
    (row) =>
      Array.isArray(row) && row.length === stepCount && row.every(isCellValue),
  );
}

/** Converts legacy boolean cells to levels and clamps numbers to 0..2. */
export function normalizeGrid(grid: DrumMachineGrid): DrumMachineGrid {
  return grid.map((row) =>
    row.map((cell) => {
      if (typeof cell === 'boolean') {
        return cell ? 1 : 0;
      }
      return Math.min(2, Math.max(0, Math.round(cell)));
    }),
  );
}

/** Step count of a grid (rows are always uniform after validation). */
export function gridStepCount(grid: DrumMachineGrid): StepCount {
  const length = grid[0]?.length;
  return isStepCount(length) ? length : STEP_COUNT_DEFAULT;
}
