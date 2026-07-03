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
  { id: 'crash', kind: 'cymbal', cx: 0.11, cy: 0.24, size: 0.19 },
  { id: 'ride', kind: 'cymbal', cx: 0.89, cy: 0.24, size: 0.19 },
  { id: 'hihatClosed', kind: 'cymbal', cx: 0.17, cy: 0.52, size: 0.13 },
  { id: 'hihatOpen', kind: 'cymbal', cx: 0.26, cy: 0.4, size: 0.11 },
  { id: 'tomHi', kind: 'tom', cx: 0.4, cy: 0.3, size: 0.13 },
  { id: 'tomMid', kind: 'tom', cx: 0.52, cy: 0.34, size: 0.14 },
  { id: 'snare', kind: 'snare', cx: 0.58, cy: 0.52, size: 0.15 },
  { id: 'tomLow', kind: 'tom', cx: 0.82, cy: 0.6, size: 0.17 },
  { id: 'kick', kind: 'kick', cx: 0.46, cy: 0.66, size: 0.24 },
];
