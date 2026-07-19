/**
 * Turkish percussion one-shots (mono 44.1 kHz WAVs).
 * Produced by scripts/make_turkish_perc_samples.py into assets/samples/pads/
 * turk_*.wav — synthesized membranes/jingles, treat as bundled samples.
 */

export type TurkishPercVoice =
  | 'darbukaDum'
  | 'darbukaTek'
  | 'darbukaKa'
  | 'darbukaSlap'
  | 'darbukaFlam'
  | 'bendirDum'
  | 'bendirTek'
  | 'bendirBuzz'
  | 'defHit'
  | 'defJingle'
  | 'defSlap'
  | 'kasik'
  | 'kasikDouble'
  | 'zilliMasa'
  | 'zilliMasaLong';

export const TURKISH_PERC_FILES: Record<TurkishPercVoice, number> = {
  darbukaDum: require('../../../assets/samples/pads/turk_darbuka_dum.wav'),
  darbukaTek: require('../../../assets/samples/pads/turk_darbuka_tek.wav'),
  darbukaKa: require('../../../assets/samples/pads/turk_darbuka_ka.wav'),
  darbukaSlap: require('../../../assets/samples/pads/turk_darbuka_slap.wav'),
  darbukaFlam: require('../../../assets/samples/pads/turk_darbuka_flam.wav'),
  bendirDum: require('../../../assets/samples/pads/turk_bendir_dum.wav'),
  bendirTek: require('../../../assets/samples/pads/turk_bendir_tek.wav'),
  bendirBuzz: require('../../../assets/samples/pads/turk_bendir_buzz.wav'),
  defHit: require('../../../assets/samples/pads/turk_def_hit.wav'),
  defJingle: require('../../../assets/samples/pads/turk_def_jingle.wav'),
  defSlap: require('../../../assets/samples/pads/turk_def_slap.wav'),
  kasik: require('../../../assets/samples/pads/turk_kasik.wav'),
  kasikDouble: require('../../../assets/samples/pads/turk_kasik_double.wav'),
  zilliMasa: require('../../../assets/samples/pads/turk_zilli_masa.wav'),
  zilliMasaLong: require('../../../assets/samples/pads/turk_zilli_masa_long.wav'),
};
