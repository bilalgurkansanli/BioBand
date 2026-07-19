import type { DrumMachineTypeId } from './drumMachineBanks';
import type { DrumMachineGrid } from './drumMachineRows';

/**
 * Built-in patterns for the drums bank. Grids are written as strings:
 * '.' = off, '1' = normal hit, '2' = accent — one char per step.
 */

type DrumRowKey =
  | 'kick'
  | 'snare'
  | 'tomMid'
  | 'hihatClosed'
  | 'hihatOpen'
  | 'ride'
  | 'crash'
  | 'tomLow';

/** Must match the drums bank row order in drumMachineBanks. */
const DRUM_ROW_ORDER: DrumRowKey[] = [
  'kick',
  'snare',
  'tomMid',
  'hihatClosed',
  'hihatOpen',
  'ride',
  'crash',
  'tomLow',
];

function makeGrid(
  stepCount: number,
  rows: Partial<Record<DrumRowKey, string>>,
): DrumMachineGrid {
  return DRUM_ROW_ORDER.map((key) => {
    const pattern = rows[key] ?? '';
    return Array.from({ length: stepCount }, (_, step) => {
      const char = pattern[step];
      return char === '2' ? 2 : char === '1' ? 1 : 0;
    });
  });
}

export type DrumMachinePreset = {
  id: string;
  labelKey: string;
  bpm: number;
  machineType: DrumMachineTypeId;
  grid: DrumMachineGrid;
};

export const DRUM_MACHINE_PRESETS: DrumMachinePreset[] = [
  {
    id: 'preset-rock',
    labelKey: 'drumMachine.presets.rock',
    bpm: 110,
    machineType: 'drums',
    grid: makeGrid(16, {
      kick: '2.......2.1.....',
      snare: '....2.......2...',
      hihatClosed: '2.1.2.1.2.1.2.1.',
      crash: '2...............',
    }),
  },
  {
    id: 'preset-hiphop',
    labelKey: 'drumMachine.presets.hiphop',
    bpm: 90,
    machineType: 'drums',
    grid: makeGrid(16, {
      kick: '2.....1...2.....',
      snare: '....2.......2...',
      hihatClosed: '1.1.1.1.1.1.1.11',
    }),
  },
  {
    id: 'preset-techno',
    labelKey: 'drumMachine.presets.techno',
    bpm: 128,
    machineType: 'drums',
    grid: makeGrid(16, {
      kick: '2...2...2...2...',
      snare: '....1.......1...',
      hihatClosed: '1.1.1.1.1.1.1.1.',
      hihatOpen: '..1...1...1...1.',
    }),
  },
  {
    id: 'preset-disco',
    labelKey: 'drumMachine.presets.disco',
    bpm: 118,
    machineType: 'drums',
    grid: makeGrid(16, {
      kick: '2...1...2...1...',
      snare: '....2.......2...',
      hihatClosed: '1...1...1...1...',
      hihatOpen: '..1...1...1...1.',
    }),
  },
  {
    id: 'preset-trap',
    labelKey: 'drumMachine.presets.trap',
    bpm: 140,
    machineType: 'drums',
    grid: makeGrid(16, {
      kick: '2.....1.......1.',
      snare: '........2.......',
      hihatClosed: '1.1.1.111.1.1.11',
    }),
  },
  {
    id: 'preset-ciftetelli',
    labelKey: 'drumMachine.presets.ciftetelli',
    bpm: 96,
    machineType: 'drums',
    grid: makeGrid(16, {
      kick: '2.......1.1.....',
      snare: '...1..1.....1.1.',
      hihatClosed: '1.1.1.1.1.1.1.1.',
    }),
  },
  {
    id: 'preset-halay',
    labelKey: 'drumMachine.presets.halay',
    bpm: 130,
    machineType: 'drums',
    grid: makeGrid(16, {
      kick: '2...1...2...1...',
      snare: '....2.......2...',
      tomLow: '..1...1...1...1.',
      crash: '2...............',
    }),
  },
  {
    id: 'preset-roman',
    labelKey: 'drumMachine.presets.roman',
    bpm: 130,
    machineType: 'drums',
    // 9/8 aksak (2+2+2+3): düm-tek düm-tek düm tek-tek.
    grid: makeGrid(9, {
      kick: '2...1....',
      snare: '..1...1.1',
      hihatClosed: '1.1.1.1.1',
      tomLow: '.......1.',
    }),
  },
  {
    id: 'preset-aksak',
    labelKey: 'drumMachine.presets.aksak',
    bpm: 120,
    machineType: 'drums',
    // 9/8 in 16ths (4+4+4+6) — roomier aksak for fills.
    grid: makeGrid(18, {
      kick: '2.......1...1.....',
      snare: '....1...........11',
      hihatClosed: '1.1.1.1.1.1.1.1.1.',
    }),
  },
];
