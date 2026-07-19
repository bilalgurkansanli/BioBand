import type { DrumSoundId } from './drumsSounds';

export type DrumPieceKind = 'cymbal' | 'tom' | 'snare' | 'kick';

export type DrumLayoutItem = {
  id: DrumSoundId;
  kind: DrumPieceKind;
  /** Center X as fraction of stage width (0–1). */
  cx: number;
  /** Center Y as fraction of stage height (0–1). */
  cy: number;
  /** Diameter as fraction of the shorter stage side. */
  size: number;
};

// Top-down kit layout inspired by a real drum set (landscape, player at bottom).
export const DRUM_KIT_LAYOUT: DrumLayoutItem[] = [
  { id: 'crash', kind: 'cymbal', cx: 0.13, cy: 0.24, size: 0.22 },
  { id: 'ride', kind: 'cymbal', cx: 0.87, cy: 0.24, size: 0.23 },
  { id: 'hihatClosed', kind: 'cymbal', cx: 0.15, cy: 0.55, size: 0.15 },
  { id: 'hihatOpen', kind: 'cymbal', cx: 0.27, cy: 0.38, size: 0.13 },
  { id: 'tomHi', kind: 'tom', cx: 0.41, cy: 0.26, size: 0.15 },
  { id: 'tomMid', kind: 'tom', cx: 0.55, cy: 0.29, size: 0.16 },
  { id: 'snare', kind: 'snare', cx: 0.61, cy: 0.55, size: 0.17 },
  { id: 'tomLow', kind: 'tom', cx: 0.8, cy: 0.6, size: 0.19 },
  { id: 'kick', kind: 'kick', cx: 0.45, cy: 0.66, size: 0.27 },
];
