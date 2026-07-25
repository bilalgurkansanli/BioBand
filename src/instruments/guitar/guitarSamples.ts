// Guitar single-note recordings (tonejs-instruments / public domain).
// Acoustic + electric banks; nearest-anchor lookup keeps playbackRate near 1.0.

export type GuitarSampleBankId = 'acoustic' | 'electric';

export type GuitarAcousticSampleId =
  | 'E2'
  | 'G2'
  | 'A2'
  | 'C3'
  | 'D3'
  | 'E3'
  | 'G3'
  | 'A3'
  | 'B3'
  | 'C4'
  | 'D4'
  | 'E4'
  | 'G4'
  | 'A4'
  | 'B4'
  | 'C5'
  | 'D5';

export type GuitarElectricSampleId =
  | 'E2'
  | 'Fs2'
  | 'A2'
  | 'C3'
  | 'Ds3'
  | 'Fs3'
  | 'A3'
  | 'C4'
  | 'Ds4'
  | 'Fs4'
  | 'A4'
  | 'C5'
  | 'Ds5'
  | 'Fs5';

export type GuitarSampleId = GuitarAcousticSampleId | GuitarElectricSampleId;

export const GUITAR_ACOUSTIC_SAMPLE_FILES: Record<GuitarAcousticSampleId, number> = {
  E2: require('../../../assets/samples/guitar/E2.mp3'),
  G2: require('../../../assets/samples/guitar/G2.mp3'),
  A2: require('../../../assets/samples/guitar/A2.mp3'),
  C3: require('../../../assets/samples/guitar/C3.mp3'),
  D3: require('../../../assets/samples/guitar/D3.mp3'),
  E3: require('../../../assets/samples/guitar/E3.mp3'),
  G3: require('../../../assets/samples/guitar/G3.mp3'),
  A3: require('../../../assets/samples/guitar/A3.mp3'),
  B3: require('../../../assets/samples/guitar/B3.mp3'),
  C4: require('../../../assets/samples/guitar/C4.mp3'),
  D4: require('../../../assets/samples/guitar/D4.mp3'),
  E4: require('../../../assets/samples/guitar/E4.mp3'),
  G4: require('../../../assets/samples/guitar/G4.mp3'),
  A4: require('../../../assets/samples/guitar/A4.mp3'),
  B4: require('../../../assets/samples/guitar/B4.mp3'),
  C5: require('../../../assets/samples/guitar/C5.mp3'),
  D5: require('../../../assets/samples/guitar/D5.mp3'),
};

export const GUITAR_ELECTRIC_SAMPLE_FILES: Record<GuitarElectricSampleId, number> = {
  E2: require('../../../assets/samples/guitar/electric/E2.mp3'),
  Fs2: require('../../../assets/samples/guitar/electric/Fs2.mp3'),
  A2: require('../../../assets/samples/guitar/electric/A2.mp3'),
  C3: require('../../../assets/samples/guitar/electric/C3.mp3'),
  Ds3: require('../../../assets/samples/guitar/electric/Ds3.mp3'),
  Fs3: require('../../../assets/samples/guitar/electric/Fs3.mp3'),
  A3: require('../../../assets/samples/guitar/electric/A3.mp3'),
  C4: require('../../../assets/samples/guitar/electric/C4.mp3'),
  Ds4: require('../../../assets/samples/guitar/electric/Ds4.mp3'),
  Fs4: require('../../../assets/samples/guitar/electric/Fs4.mp3'),
  A4: require('../../../assets/samples/guitar/electric/A4.mp3'),
  C5: require('../../../assets/samples/guitar/electric/C5.mp3'),
  Ds5: require('../../../assets/samples/guitar/electric/Ds5.mp3'),
  Fs5: require('../../../assets/samples/guitar/electric/Fs5.mp3'),
};

const ACOUSTIC_ANCHORS: { id: GuitarAcousticSampleId; midi: number }[] = [
  { id: 'E2', midi: 40 },
  { id: 'G2', midi: 43 },
  { id: 'A2', midi: 45 },
  { id: 'C3', midi: 48 },
  { id: 'D3', midi: 50 },
  { id: 'E3', midi: 52 },
  { id: 'G3', midi: 55 },
  { id: 'A3', midi: 57 },
  { id: 'B3', midi: 59 },
  { id: 'C4', midi: 60 },
  { id: 'D4', midi: 62 },
  { id: 'E4', midi: 64 },
  { id: 'G4', midi: 67 },
  { id: 'A4', midi: 69 },
  { id: 'B4', midi: 71 },
  { id: 'C5', midi: 72 },
  { id: 'D5', midi: 74 },
];

const ELECTRIC_ANCHORS: { id: GuitarElectricSampleId; midi: number }[] = [
  { id: 'E2', midi: 40 },
  { id: 'Fs2', midi: 42 },
  { id: 'A2', midi: 45 },
  { id: 'C3', midi: 48 },
  { id: 'Ds3', midi: 51 },
  { id: 'Fs3', midi: 54 },
  { id: 'A3', midi: 57 },
  { id: 'C4', midi: 60 },
  { id: 'Ds4', midi: 63 },
  { id: 'Fs4', midi: 66 },
  { id: 'A4', midi: 69 },
  { id: 'C5', midi: 72 },
  { id: 'Ds5', midi: 75 },
  { id: 'Fs5', midi: 78 },
];

export type GuitarNoteSampleConfig = {
  bank: GuitarSampleBankId;
  anchorId: string;
  source: number;
  playbackRate: number;
};

export function getGuitarNoteSampleConfig(
  midi: number,
  bank: GuitarSampleBankId = 'acoustic',
): GuitarNoteSampleConfig {
  if (bank === 'electric') {
    let closest = ELECTRIC_ANCHORS[0];
    for (const anchor of ELECTRIC_ANCHORS) {
      if (Math.abs(midi - anchor.midi) < Math.abs(midi - closest.midi)) {
        closest = anchor;
      }
    }
    return {
      bank: 'electric',
      anchorId: closest.id,
      source: GUITAR_ELECTRIC_SAMPLE_FILES[closest.id],
      playbackRate: 2 ** ((midi - closest.midi) / 12),
    };
  }

  let closest = ACOUSTIC_ANCHORS[0];
  for (const anchor of ACOUSTIC_ANCHORS) {
    if (Math.abs(midi - anchor.midi) < Math.abs(midi - closest.midi)) {
      closest = anchor;
    }
  }
  return {
    bank: 'acoustic',
    anchorId: closest.id,
    source: GUITAR_ACOUSTIC_SAMPLE_FILES[closest.id],
    playbackRate: 2 ** ((midi - closest.midi) / 12),
  };
}

export function sampleBankForVoice(voiceId: string): GuitarSampleBankId {
  return voiceId === 'electric' ? 'electric' : 'acoustic';
}
