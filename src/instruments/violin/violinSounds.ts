// Pizzicato-style samples — one per open string, repitched for fingered notes.

export type ViolinStringId = 'v1' | 'v2' | 'v3' | 'v4';

export const VIOLIN_STRINGS: {
  id: ViolinStringId;
  openMidi: number;
  labelKey: string;
}[] = [
  { id: 'v1', openMidi: 76, labelKey: 'violin.strings.e' },
  { id: 'v2', openMidi: 69, labelKey: 'violin.strings.a' },
  { id: 'v3', openMidi: 62, labelKey: 'violin.strings.d' },
  { id: 'v4', openMidi: 55, labelKey: 'violin.strings.g' },
];

export const STRING_SAMPLE_FILES: Record<ViolinStringId, number> = {
  v1: require('../../../assets/samples/violin/v1_E5.mp3'),
  v2: require('../../../assets/samples/violin/v2_A4.mp3'),
  v3: require('../../../assets/samples/violin/v3_D4.mp3'),
  v4: require('../../../assets/samples/violin/v4_G3.mp3'),
};

export function getStringPlaybackRate(stringId: ViolinStringId, midi: number): number {
  const openMidi = VIOLIN_STRINGS.find((s) => s.id === stringId)?.openMidi ?? 69;
  return 2 ** ((midi - openMidi) / 12);
}
