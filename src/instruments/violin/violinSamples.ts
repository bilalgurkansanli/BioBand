// Violin arco recordings (tonejs-instruments / public domain).
// Nearest-anchor lookup keeps playbackRate near 1.0 across the fingerboard.

export type ViolinSampleId =
  | 'G3'
  | 'A3'
  | 'C4'
  | 'E4'
  | 'G4'
  | 'A4'
  | 'C5'
  | 'E5'
  | 'G5'
  | 'A5'
  | 'C6'
  | 'E6';

export const VIOLIN_SAMPLE_FILES: Record<ViolinSampleId, number> = {
  G3: require('../../../assets/samples/violin/G3.mp3'),
  A3: require('../../../assets/samples/violin/A3.mp3'),
  C4: require('../../../assets/samples/violin/C4.mp3'),
  E4: require('../../../assets/samples/violin/E4.mp3'),
  G4: require('../../../assets/samples/violin/G4.mp3'),
  A4: require('../../../assets/samples/violin/A4.mp3'),
  C5: require('../../../assets/samples/violin/C5.mp3'),
  E5: require('../../../assets/samples/violin/E5.mp3'),
  G5: require('../../../assets/samples/violin/G5.mp3'),
  A5: require('../../../assets/samples/violin/A5.mp3'),
  C6: require('../../../assets/samples/violin/C6.mp3'),
  E6: require('../../../assets/samples/violin/E6.mp3'),
};

// tuneCents / offsetSeconds / gainTrim are measured, not tuned by ear:
// ffmpeg-decoded, f0 via autocorrelation (median of 7 windows, A4 = 440),
// offset = where the bowed tone is developed (several recordings spend their
// first seconds on a slow crescendo that sounds thin in short strokes),
// gainTrim = RMS at that entry point normalized toward the bank median.
type ViolinAnchor = {
  id: ViolinSampleId;
  midi: number;
  tuneCents: number;
  offsetSeconds: number;
  gainTrim: number;
};

const ANCHORS: ViolinAnchor[] = [
  { id: 'G3', midi: 55, tuneCents: -2, offsetSeconds: 0, gainTrim: 0.96 },
  { id: 'A3', midi: 57, tuneCents: 0, offsetSeconds: 0, gainTrim: 1.13 },
  { id: 'C4', midi: 60, tuneCents: 5, offsetSeconds: 0, gainTrim: 0.9 },
  { id: 'E4', midi: 64, tuneCents: -3, offsetSeconds: 3.92, gainTrim: 0.99 },
  { id: 'G4', midi: 67, tuneCents: 4, offsetSeconds: 1.18, gainTrim: 0.95 },
  { id: 'A4', midi: 69, tuneCents: 10, offsetSeconds: 0, gainTrim: 1.23 },
  { id: 'C5', midi: 72, tuneCents: 7, offsetSeconds: 1.97, gainTrim: 0.82 },
  { id: 'E5', midi: 76, tuneCents: 15, offsetSeconds: 1.51, gainTrim: 1.09 },
  { id: 'G5', midi: 79, tuneCents: 4, offsetSeconds: 0.04, gainTrim: 1.14 },
  { id: 'A5', midi: 81, tuneCents: 3, offsetSeconds: 0, gainTrim: 0.85 },
  { id: 'C6', midi: 84, tuneCents: -11, offsetSeconds: 0, gainTrim: 1.01 },
  { id: 'E6', midi: 88, tuneCents: 16, offsetSeconds: 2.6, gainTrim: 1.11 },
];

export type ViolinNoteSampleConfig = {
  anchorId: ViolinSampleId;
  source: number;
  playbackRate: number;
  offsetSeconds: number;
  gainTrim: number;
};

export function getViolinNoteSampleConfig(midi: number): ViolinNoteSampleConfig {
  let closest = ANCHORS[0];
  for (const anchor of ANCHORS) {
    if (Math.abs(midi - anchor.midi) < Math.abs(midi - closest.midi)) {
      closest = anchor;
    }
  }
  return {
    anchorId: closest.id,
    source: VIOLIN_SAMPLE_FILES[closest.id],
    // Interval shift + correction of the recording's own detune.
    playbackRate: 2 ** ((midi - closest.midi) / 12 - closest.tuneCents / 1200),
    offsetSeconds: closest.offsetSeconds,
    gainTrim: closest.gainTrim,
  };
}
