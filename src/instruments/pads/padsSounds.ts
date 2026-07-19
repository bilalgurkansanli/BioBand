// Shared pad ids — charts / recording always use these (bank-independent).

export type PadSoundId =
  | 'pad01'
  | 'pad02'
  | 'pad03'
  | 'pad04'
  | 'pad05'
  | 'pad06'
  | 'pad07'
  | 'pad08'
  | 'pad09'
  | 'pad10'
  | 'pad11'
  | 'pad12'
  | 'pad13'
  | 'pad14'
  | 'pad15'
  | 'pad16';

export const PAD_SOUND_IDS: PadSoundId[] = [
  'pad01',
  'pad02',
  'pad03',
  'pad04',
  'pad05',
  'pad06',
  'pad07',
  'pad08',
  'pad09',
  'pad10',
  'pad11',
  'pad12',
  'pad13',
  'pad14',
  'pad15',
  'pad16',
];

export type LaunchPadDefinition = {
  id: PadSoundId;
  labelKey: string;
  /** Literal label (custom bank) — wins over labelKey when present. */
  rawLabel?: string;
  color: string;
};

/** Shared file modules used across banks (drums + fx). */
export const PAD_SHARED_FILES = {
  kick: require('../../../assets/samples/drums/kick.mp3'),
  snare: require('../../../assets/samples/drums/snare.mp3'),
  hat: require('../../../assets/samples/drums/hihat_closed.mp3'),
  hatOpen: require('../../../assets/samples/drums/hihat_open.mp3'),
  tomMid: require('../../../assets/samples/drums/tom_mid.mp3'),
  tomLow: require('../../../assets/samples/drums/tom_low.mp3'),
  tomHi: require('../../../assets/samples/drums/tom_hi.mp3'),
  crash: require('../../../assets/samples/drums/crash.mp3'),
  ride: require('../../../assets/samples/drums/ride.mp3'),
  clap: require('../../../assets/samples/pads/clap.wav'),
  impact: require('../../../assets/samples/pads/impact.wav'),
} as const;
