// Drum kit one-shots — sampled hits (see assets/samples/drums/README.md).
// One sample per pad (toms are pitch variants of a single tom).

export type DrumSoundId =
  | 'crash'
  | 'hihatClosed'
  | 'hihatOpen'
  | 'ride'
  | 'tomHi'
  | 'tomMid'
  | 'tomLow'
  | 'snare'
  | 'kick';

export const DRUM_SOUND_FILES: Record<DrumSoundId, number> = {
  crash: require('../../../assets/samples/drums/crash.mp3'),
  hihatClosed: require('../../../assets/samples/drums/hihat_closed.mp3'),
  hihatOpen: require('../../../assets/samples/drums/hihat_open.mp3'),
  ride: require('../../../assets/samples/drums/ride.mp3'),
  tomHi: require('../../../assets/samples/drums/tom_hi.mp3'),
  tomMid: require('../../../assets/samples/drums/tom_mid.mp3'),
  tomLow: require('../../../assets/samples/drums/tom_low.mp3'),
  snare: require('../../../assets/samples/drums/snare.mp3'),
  kick: require('../../../assets/samples/drums/kick.mp3'),
};

/**
 * Per-pad gains after peak-normalize. Crash stays quieter — old 1.25 was harsh.
 */
export const DRUM_HIT_GAINS: Record<DrumSoundId, number> = {
  kick: 0.85,
  tomLow: 1.15,
  tomMid: 1.15,
  tomHi: 1.15,
  snare: 1.15,
  hihatClosed: 1.2,
  hihatOpen: 1.15,
  ride: 1.05,
  crash: 0.78,
};

export type DrumPad = {
  id: DrumSoundId;
  labelKey: string;
  color: string;
};

export const DRUM_PADS: DrumPad[] = [
  { id: 'crash', labelKey: 'drums.pads.crash', color: '#E9C46A' },
  { id: 'hihatClosed', labelKey: 'drums.pads.hihatClosed', color: '#F4A261' },
  { id: 'hihatOpen', labelKey: 'drums.pads.hihatOpen', color: '#E76F51' },
  { id: 'ride', labelKey: 'drums.pads.ride', color: '#E9C46A' },
  { id: 'tomHi', labelKey: 'drums.pads.tomHi', color: '#2A9D8F' },
  { id: 'tomMid', labelKey: 'drums.pads.tomMid', color: '#2A9D8F' },
  { id: 'tomLow', labelKey: 'drums.pads.tomLow', color: '#2A9D8F' },
  { id: 'snare', labelKey: 'drums.pads.snare', color: '#6C5CE7' },
  { id: 'kick', labelKey: 'drums.pads.kick', color: '#457B9D' },
];
