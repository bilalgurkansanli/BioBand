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

const ANCHORS: { id: ViolinSampleId; midi: number }[] = [
  { id: 'G3', midi: 55 },
  { id: 'A3', midi: 57 },
  { id: 'C4', midi: 60 },
  { id: 'E4', midi: 64 },
  { id: 'G4', midi: 67 },
  { id: 'A4', midi: 69 },
  { id: 'C5', midi: 72 },
  { id: 'E5', midi: 76 },
  { id: 'G5', midi: 79 },
  { id: 'A5', midi: 81 },
  { id: 'C6', midi: 84 },
  { id: 'E6', midi: 88 },
];

export type ViolinNoteSampleConfig = {
  anchorId: ViolinSampleId;
  source: number;
  playbackRate: number;
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
    playbackRate: 2 ** ((midi - closest.midi) / 12),
  };
}
