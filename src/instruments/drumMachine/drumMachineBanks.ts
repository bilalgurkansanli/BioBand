import type Ionicons from '@expo/vector-icons/Ionicons';

import { PAD_SOUND_IDS } from '../pads/padsSounds';

export type DrumMachineTypeId =
  | 'drums'
  | 'piano'
  | 'guitar'
  | 'violin'
  | 'pads';

export type DrumMachineTheme = {
  accent: string;
  stageBg: string;
  cellOffA: string;
  cellOffB: string;
};

export type DrumMachineRowDef = {
  playKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  /** Short text shown instead of the icon (note names, pad numbers). */
  shortLabel?: string;
};

export type DrumMachineBank = {
  id: DrumMachineTypeId;
  labelKey: string;
  theme: DrumMachineTheme;
  rows: readonly DrumMachineRowDef[];
};

export const DRUM_MACHINE_TYPES: DrumMachineTypeId[] = [
  'drums',
  'piano',
  'guitar',
  'violin',
  'pads',
];

export const DRUM_MACHINE_BANKS: Record<DrumMachineTypeId, DrumMachineBank> = {
  drums: {
    id: 'drums',
    labelKey: 'instruments.drums',
    theme: {
      accent: '#2A9D8F',
      stageBg: '#141820',
      cellOffA: '#1A1A2E',
      cellOffB: '#252542',
    },
    rows: [
      { playKey: 'kick', icon: 'radio-button-on', labelKey: 'drums.pads.kick' },
      { playKey: 'snare', icon: 'ellipse', labelKey: 'drums.pads.snare' },
      { playKey: 'tomMid', icon: 'disc', labelKey: 'drums.pads.tomMid' },
      { playKey: 'hihatClosed', icon: 'remove', labelKey: 'drums.pads.hihatClosed' },
      { playKey: 'hihatOpen', icon: 'remove-circle-outline', labelKey: 'drums.pads.hihatOpen' },
      { playKey: 'ride', icon: 'sunny-outline', labelKey: 'drums.pads.ride' },
      { playKey: 'crash', icon: 'flash-outline', labelKey: 'drums.pads.crash' },
      { playKey: 'tomLow', icon: 'disc-outline', labelKey: 'drums.pads.tomLow' },
    ],
  },
  piano: {
    id: 'piano',
    labelKey: 'instruments.piano',
    theme: {
      accent: '#6C5CE7',
      stageBg: '#16141F',
      cellOffA: '#1A1A2E',
      cellOffB: '#252542',
    },
    rows: [
      { playKey: 'C4', icon: 'musical-note', labelKey: 'drumMachine.notes.C4', shortLabel: 'C4' },
      { playKey: 'D4', icon: 'musical-note', labelKey: 'drumMachine.notes.D4', shortLabel: 'D4' },
      { playKey: 'E4', icon: 'musical-note', labelKey: 'drumMachine.notes.E4', shortLabel: 'E4' },
      { playKey: 'F4', icon: 'musical-note', labelKey: 'drumMachine.notes.F4', shortLabel: 'F4' },
      { playKey: 'G4', icon: 'musical-note', labelKey: 'drumMachine.notes.G4', shortLabel: 'G4' },
      { playKey: 'A4', icon: 'musical-note', labelKey: 'drumMachine.notes.A4', shortLabel: 'A4' },
      { playKey: 'B4', icon: 'musical-note', labelKey: 'drumMachine.notes.B4', shortLabel: 'B4' },
      { playKey: 'C5', icon: 'musical-notes', labelKey: 'drumMachine.notes.C5', shortLabel: 'C5' },
    ],
  },
  guitar: {
    id: 'guitar',
    labelKey: 'instruments.guitar',
    theme: {
      accent: '#E9C46A',
      stageBg: '#1A1710',
      cellOffA: '#1A1A2E',
      cellOffB: '#252542',
    },
    // playKey = midi:<n>
    rows: [
      { playKey: 'midi:40', icon: 'git-commit-outline', labelKey: 'drumMachine.notes.E2', shortLabel: 'E2' },
      { playKey: 'midi:45', icon: 'git-commit-outline', labelKey: 'drumMachine.notes.A2', shortLabel: 'A2' },
      { playKey: 'midi:50', icon: 'git-commit-outline', labelKey: 'drumMachine.notes.D3', shortLabel: 'D3' },
      { playKey: 'midi:55', icon: 'git-commit-outline', labelKey: 'drumMachine.notes.G3', shortLabel: 'G3' },
      { playKey: 'midi:59', icon: 'git-commit-outline', labelKey: 'drumMachine.notes.B3', shortLabel: 'B3' },
      { playKey: 'midi:60', icon: 'git-branch-outline', labelKey: 'drumMachine.notes.C4', shortLabel: 'C4' },
      { playKey: 'midi:64', icon: 'git-branch-outline', labelKey: 'drumMachine.notes.E4', shortLabel: 'E4' },
      { playKey: 'midi:69', icon: 'git-branch-outline', labelKey: 'drumMachine.notes.A4', shortLabel: 'A4' },
    ],
  },
  violin: {
    id: 'violin',
    labelKey: 'instruments.violin',
    theme: {
      accent: '#E76F51',
      stageBg: '#1A1210',
      cellOffA: '#1A1A2E',
      cellOffB: '#252542',
    },
    rows: [
      { playKey: 'v4:0', icon: 'pulse-outline', labelKey: 'drumMachine.notes.G3', shortLabel: 'G3' },
      { playKey: 'v4:2', icon: 'pulse-outline', labelKey: 'drumMachine.notes.A3', shortLabel: 'A3' },
      { playKey: 'v4:5', icon: 'pulse-outline', labelKey: 'drumMachine.notes.C4', shortLabel: 'C4' },
      { playKey: 'v3:2', icon: 'pulse-outline', labelKey: 'drumMachine.notes.E4', shortLabel: 'E4' },
      { playKey: 'v3:5', icon: 'pulse-outline', labelKey: 'drumMachine.notes.G4', shortLabel: 'G4' },
      { playKey: 'v2:0', icon: 'pulse', labelKey: 'drumMachine.notes.A4', shortLabel: 'A4' },
      { playKey: 'v2:3', icon: 'pulse', labelKey: 'drumMachine.notes.C5', shortLabel: 'C5' },
      { playKey: 'v1:0', icon: 'pulse', labelKey: 'drumMachine.notes.E5', shortLabel: 'E5' },
    ],
  },
  pads: {
    id: 'pads',
    labelKey: 'instruments.pads',
    theme: {
      accent: '#457B9D',
      stageBg: '#101820',
      cellOffA: '#1A1A2E',
      cellOffB: '#252542',
    },
    rows: PAD_SOUND_IDS.map((id, index) => ({
      playKey: id,
      icon: (index < 8 ? 'grid' : 'apps') as keyof typeof Ionicons.glyphMap,
      labelKey: `drumMachine.pads.${id}`,
      shortLabel: String(index + 1).padStart(2, '0'),
    })),
  },
};

export function getDrumMachineBank(typeId: DrumMachineTypeId): DrumMachineBank {
  return DRUM_MACHINE_BANKS[typeId];
}

export function isDrumMachineTypeId(value: unknown): value is DrumMachineTypeId {
  return (
    value === 'drums' ||
    value === 'piano' ||
    value === 'guitar' ||
    value === 'violin' ||
    value === 'pads'
  );
}
