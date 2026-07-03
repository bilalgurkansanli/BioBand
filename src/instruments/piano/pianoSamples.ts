// Salamander Grand Piano — real acoustic grand piano single-note recordings.
// Source: Yamaha C5, sampled by Alexander Holm (CC BY 3.0), via Tone.js demo assets.
// Eight base pitches are repitched slightly to cover all 24 keys (standard sampler approach).

export type BaseSampleId = 'C4' | 'Ds4' | 'Fs4' | 'A4' | 'C5' | 'Ds5' | 'Fs5' | 'A5';

export const BASE_SAMPLE_FILES: Record<BaseSampleId, number> = {
  C4: require('../../../assets/samples/piano/C4.mp3'),
  Ds4: require('../../../assets/samples/piano/Ds4.mp3'),
  Fs4: require('../../../assets/samples/piano/Fs4.mp3'),
  A4: require('../../../assets/samples/piano/A4.mp3'),
  C5: require('../../../assets/samples/piano/C5.mp3'),
  Ds5: require('../../../assets/samples/piano/Ds5.mp3'),
  Fs5: require('../../../assets/samples/piano/Fs5.mp3'),
  A5: require('../../../assets/samples/piano/A5.mp3'),
};

export const SAMPLE_ANCHORS: { id: BaseSampleId; midi: number }[] = [
  { id: 'C4', midi: 60 },
  { id: 'Ds4', midi: 63 },
  { id: 'Fs4', midi: 66 },
  { id: 'A4', midi: 69 },
  { id: 'C5', midi: 72 },
  { id: 'Ds5', midi: 75 },
  { id: 'Fs5', midi: 78 },
  { id: 'A5', midi: 81 },
];

export type NoteSampleConfig = {
  anchorId: BaseSampleId;
  source: number;
  playbackRate: number;
};

export function getNoteSampleConfig(midi: number): NoteSampleConfig {
  let closest = SAMPLE_ANCHORS[0];

  for (const anchor of SAMPLE_ANCHORS) {
    if (Math.abs(midi - anchor.midi) < Math.abs(midi - closest.midi)) {
      closest = anchor;
    }
  }

  return {
    anchorId: closest.id,
    source: BASE_SAMPLE_FILES[closest.id],
    playbackRate: 2 ** ((midi - closest.midi) / 12),
  };
}
