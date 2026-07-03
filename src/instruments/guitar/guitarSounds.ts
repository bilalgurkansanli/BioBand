// Nylon-style pluck samples — one per open string, repitched for fretted notes.

export type GuitarStringId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6';

export const GUITAR_STRINGS: { id: GuitarStringId; openMidi: number; label: string }[] = [
  { id: 's6', openMidi: 40, label: 'E' },
  { id: 's5', openMidi: 45, label: 'A' },
  { id: 's4', openMidi: 50, label: 'D' },
  { id: 's3', openMidi: 55, label: 'G' },
  { id: 's2', openMidi: 59, label: 'B' },
  { id: 's1', openMidi: 64, label: 'e' },
];

export const STRING_SAMPLE_FILES: Record<GuitarStringId, number> = {
  s6: require('../../../assets/samples/guitar/s6_E2.mp3'),
  s5: require('../../../assets/samples/guitar/s5_A2.mp3'),
  s4: require('../../../assets/samples/guitar/s4_D3.mp3'),
  s3: require('../../../assets/samples/guitar/s3_G3.mp3'),
  s2: require('../../../assets/samples/guitar/s2_B3.mp3'),
  s1: require('../../../assets/samples/guitar/s1_E4.mp3'),
};

export function getStringPlaybackRate(stringId: GuitarStringId, midi: number): number {
  const openMidi = GUITAR_STRINGS.find((s) => s.id === stringId)?.openMidi ?? 64;
  return 2 ** ((midi - openMidi) / 12);
}
