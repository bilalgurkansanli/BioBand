// Launch pad one-shots — drum hits + synth stabs (16 pads).

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

export const PAD_SOUND_FILES: Record<PadSoundId, number> = {
  pad01: require('../../../assets/samples/pads/pad01_kick.mp3'),
  pad02: require('../../../assets/samples/pads/pad02_snare.mp3'),
  pad03: require('../../../assets/samples/pads/pad03_hat.mp3'),
  pad04: require('../../../assets/samples/pads/pad04_hat_open.mp3'),
  pad05: require('../../../assets/samples/pads/pad05_tom.mp3'),
  pad06: require('../../../assets/samples/pads/pad06_perc.mp3'),
  pad07: require('../../../assets/samples/pads/pad07_fx.mp3'),
  pad08: require('../../../assets/samples/pads/pad08_fx.mp3'),
  pad09: require('../../../assets/samples/pads/pad09_C3.mp3'),
  pad10: require('../../../assets/samples/pads/pad10_E3.mp3'),
  pad11: require('../../../assets/samples/pads/pad11_G3.mp3'),
  pad12: require('../../../assets/samples/pads/pad12_C4.mp3'),
  pad13: require('../../../assets/samples/pads/pad13_E4.mp3'),
  pad14: require('../../../assets/samples/pads/pad14_G4.mp3'),
  pad15: require('../../../assets/samples/pads/pad15_A4.mp3'),
  pad16: require('../../../assets/samples/pads/pad16_C5.mp3'),
};

export type LaunchPadDefinition = {
  id: PadSoundId;
  labelKey: string;
  color: string;
};

export const LAUNCH_PADS: LaunchPadDefinition[] = [
  { id: 'pad01', labelKey: 'pads.labels.kick', color: '#457B9D' },
  { id: 'pad02', labelKey: 'pads.labels.snare', color: '#6C5CE7' },
  { id: 'pad03', labelKey: 'pads.labels.hat', color: '#F4A261' },
  { id: 'pad04', labelKey: 'pads.labels.hatOpen', color: '#E76F51' },
  { id: 'pad05', labelKey: 'pads.labels.tom', color: '#2A9D8F' },
  { id: 'pad06', labelKey: 'pads.labels.perc', color: '#264653' },
  { id: 'pad07', labelKey: 'pads.labels.fx1', color: '#E9C46A' },
  { id: 'pad08', labelKey: 'pads.labels.fx2', color: '#E9C46A' },
  { id: 'pad09', labelKey: 'pads.labels.stab1', color: '#9B59B6' },
  { id: 'pad10', labelKey: 'pads.labels.stab2', color: '#8E44AD' },
  { id: 'pad11', labelKey: 'pads.labels.stab3', color: '#3498DB' },
  { id: 'pad12', labelKey: 'pads.labels.stab4', color: '#2980B9' },
  { id: 'pad13', labelKey: 'pads.labels.stab5', color: '#1ABC9C' },
  { id: 'pad14', labelKey: 'pads.labels.stab6', color: '#16A085' },
  { id: 'pad15', labelKey: 'pads.labels.stab7', color: '#E74C3C' },
  { id: 'pad16', labelKey: 'pads.labels.stab8', color: '#C0392B' },
];
