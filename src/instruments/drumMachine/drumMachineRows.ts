export const STEP_COUNT = 16;

export const BPM_MIN = 60;
export const BPM_MAX = 180;
export const BPM_DEFAULT = 120;

export type DrumMachineGrid = boolean[][];

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

export function createEmptyGrid(rowCount: number): DrumMachineGrid {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: STEP_COUNT }, () => false),
  );
}

export function cloneGrid(grid: DrumMachineGrid): DrumMachineGrid {
  return grid.map((row) => [...row]);
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
): boolean {
  if (style === 'groove' && rowIndex === 0) {
    if (step === 0) return true;
    if (step % 4 === 0) return Math.random() < 0.7;
    if (step % 4 === 2) return Math.random() < 0.35;
  }
  if (style === 'offbeat') {
    if (step % 2 === 1) return Math.random() < density * 1.6;
    return Math.random() < density * 0.35;
  }
  if (style === 'minimal' && rowIndex === 0) {
    return step % 4 === 0 && Math.random() < 0.85;
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
): DrumMachineGrid {
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const density = densityForStyle(style, rowIndex, rowCount);
    return Array.from({ length: STEP_COUNT }, (_, step) =>
      shouldPlace(style, rowIndex, step, density),
    );
  });
}

export function isValidGrid(value: unknown, expectedRows?: number): value is DrumMachineGrid {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }
  if (expectedRows !== undefined && value.length !== expectedRows) {
    return false;
  }
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === STEP_COUNT &&
      row.every((cell) => typeof cell === 'boolean'),
  );
}
