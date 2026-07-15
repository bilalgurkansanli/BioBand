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
  { id: 'crash', kind: 'cymbal', cx: 0.12, cy: 0.22, size: 0.2 },
  { id: 'ride', kind: 'cymbal', cx: 0.88, cy: 0.22, size: 0.2 },
  { id: 'hihatClosed', kind: 'cymbal', cx: 0.16, cy: 0.5, size: 0.125 },
  { id: 'hihatOpen', kind: 'cymbal', cx: 0.25, cy: 0.38, size: 0.11 },
  { id: 'tomHi', kind: 'tom', cx: 0.4, cy: 0.28, size: 0.125 },
  { id: 'tomMid', kind: 'tom', cx: 0.52, cy: 0.32, size: 0.135 },
  { id: 'snare', kind: 'snare', cx: 0.57, cy: 0.52, size: 0.145 },
  { id: 'tomLow', kind: 'tom', cx: 0.8, cy: 0.58, size: 0.165 },
  { id: 'kick', kind: 'kick', cx: 0.45, cy: 0.68, size: 0.23 },
];
