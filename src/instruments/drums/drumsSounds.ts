// Drum kit one-shots — sampled hits (see assets/samples/drums/README.md).
// One sample per pad (toms are pitch variants of a single tom).

import type { DrumKitId } from './drumsKits';

export type DrumSoundId =
  | 'crash'
  | 'hihatClosed'
  | 'hihatOpen'
  | 'ride'
  | 'tomHi'
  | 'tomMid'
  | 'tomLow'
  | 'snare'
  /** Side-stick / rim click — played by hitting the snare's outer rim zone. */
  | 'snareRim'
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
  snareRim: require('../../../assets/samples/drums/sidestick.mp3'),
  kick: require('../../../assets/samples/drums/kick.mp3'),
};

/**
 * Per-kit sample replacements. Kits not listed keep the acoustic set
 * (shaped by their bus filter); the electronic kit swaps in real
 * synthesized 808 one-shots (see scripts/make_extra_drum_samples.py).
 */
export const KIT_SOUND_OVERRIDES: Partial<
  Record<DrumKitId, Partial<Record<DrumSoundId, number>>>
> = {
  electronic: {
    crash: require('../../../assets/samples/drums/808/crash.mp3'),
    hihatClosed: require('../../../assets/samples/drums/808/hihat_closed.mp3'),
    hihatOpen: require('../../../assets/samples/drums/808/hihat_open.mp3'),
    ride: require('../../../assets/samples/drums/808/ride.mp3'),
    tomHi: require('../../../assets/samples/drums/808/tom_hi.mp3'),
    tomMid: require('../../../assets/samples/drums/808/tom_mid.mp3'),
    tomLow: require('../../../assets/samples/drums/808/tom_low.mp3'),
    snare: require('../../../assets/samples/drums/808/snare.mp3'),
    snareRim: require('../../../assets/samples/drums/808/rim.mp3'),
    kick: require('../../../assets/samples/drums/808/kick.mp3'),
  },
};

/** Per-pad gains after peak-normalize. */
export const DRUM_HIT_GAINS: Record<DrumSoundId, number> = {
  kick: 0.95,
  tomLow: 1.15,
  tomMid: 1.15,
  tomHi: 1.15,
  snare: 1.15,
  snareRim: 1.1,
  hihatClosed: 1.2,
  hihatOpen: 1.15,
  ride: 1.05,
  crash: 0.82,
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
