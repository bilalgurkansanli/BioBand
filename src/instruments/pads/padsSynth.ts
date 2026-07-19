/**
 * Pre-generated one-shot WAVs (Expo Go has no AudioContext.createBuffer).
 * Produced by scripts/make_pads_fx_samples.py into assets/samples/pads/
 * synth_*.wav — treat as bundled samples.
 */

export type PadSynthVoice =
  | 'eightOhEight'
  | 'riser'
  | 'whoosh'
  | 'noise'
  | 'tick'
  | 'sweep'
  | 'subDrop'
  | 'reverse'
  | 'laser'
  | 'stab'
  | 'tapeStop'
  | 'boom';

export const PAD_SYNTH_FILES: Record<PadSynthVoice, number> = {
  eightOhEight: require('../../../assets/samples/pads/synth_808.wav'),
  riser: require('../../../assets/samples/pads/synth_riser.wav'),
  whoosh: require('../../../assets/samples/pads/synth_whoosh.wav'),
  noise: require('../../../assets/samples/pads/synth_noise.wav'),
  tick: require('../../../assets/samples/pads/synth_tick.wav'),
  sweep: require('../../../assets/samples/pads/synth_sweep.wav'),
  subDrop: require('../../../assets/samples/pads/synth_subdrop.wav'),
  reverse: require('../../../assets/samples/pads/synth_reverse.wav'),
  laser: require('../../../assets/samples/pads/synth_laser.wav'),
  stab: require('../../../assets/samples/pads/synth_stab.wav'),
  tapeStop: require('../../../assets/samples/pads/synth_tapestop.wav'),
  boom: require('../../../assets/samples/pads/synth_boom.wav'),
};
