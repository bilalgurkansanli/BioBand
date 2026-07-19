import { PAD_SHARED_FILES, PAD_SOUND_IDS, type LaunchPadDefinition, type PadSoundId } from './padsSounds';
import { PAD_SYNTH_FILES, type PadSynthVoice } from './padsSynth';
import { TURKISH_PERC_FILES, type TurkishPercVoice } from './padsTurkish';

export type PadBankId = 'drums' | 'melodic' | 'fx' | 'turkish' | 'custom';

export const PAD_BANK_IDS: PadBankId[] = ['drums', 'melodic', 'fx', 'turkish', 'custom'];

export type PadBankTheme = {
  accent: string;
  stageBg: string;
  stageOverlay: string;
};

export type PadBankAudio = {
  playbackRate: number;
  gainScale: number;
  filterType: 'lowpass' | 'highpass' | 'peaking' | 'lowshelf';
  filterFrequency: number;
  filterQ: number;
};

export type PadHitEnvelope = {
  attackSeconds: number;
  holdSeconds: number;
  releaseSeconds: number;
  rateScale: number;
};

export type PadSlotSource =
  | { kind: 'file'; module: number }
  | { kind: 'piano'; midi: number }
  | { kind: 'synth'; voice: PadSynthVoice }
  | { kind: 'turkish'; voice: TurkishPercVoice }
  | { kind: 'user'; uri: string };

export type PadChokeGroup = 'a' | 'b';

export type PadSlotDef = {
  id: PadSoundId;
  labelKey: string;
  /** Literal label (custom bank / user samples) — wins over labelKey. */
  rawLabel?: string;
  color: string;
  source: PadSlotSource;
  gain: number;
  envelope: PadHitEnvelope;
  /** Route through bright (cymbal) tone filter. */
  bright?: boolean;
  /** Closed-hat style choke of open hat (pad04). */
  chokeOpenHat?: boolean;
  /** Custom-bank choke group — triggering one slot silences the others. */
  chokeGroup?: PadChokeGroup;
};

export type PadBankDefinition = {
  id: PadBankId;
  icon: string;
  labelKey: string;
  theme: PadBankTheme;
  audio: PadBankAudio;
  slots: PadSlotDef[];
};

const ENV = {
  kick: { attackSeconds: 0.001, holdSeconds: 0.55, releaseSeconds: 0.35, rateScale: 1 },
  snare: { attackSeconds: 0.001, holdSeconds: 0.35, releaseSeconds: 0.25, rateScale: 1 },
  hat: { attackSeconds: 0.001, holdSeconds: 0.12, releaseSeconds: 0.1, rateScale: 1 },
  hatOpen: { attackSeconds: 0.002, holdSeconds: 0.55, releaseSeconds: 0.45, rateScale: 1 },
  tom: { attackSeconds: 0.002, holdSeconds: 0.5, releaseSeconds: 0.4, rateScale: 1 },
  clap: { attackSeconds: 0.001, holdSeconds: 0.28, releaseSeconds: 0.22, rateScale: 1 },
  crash: { attackSeconds: 0.006, holdSeconds: 0.45, releaseSeconds: 0.55, rateScale: 0.94 },
  ride: { attackSeconds: 0.004, holdSeconds: 1.1, releaseSeconds: 0.9, rateScale: 1 },
  eight: { attackSeconds: 0.002, holdSeconds: 0.7, releaseSeconds: 0.5, rateScale: 1 },
  impact: { attackSeconds: 0.002, holdSeconds: 0.4, releaseSeconds: 0.45, rateScale: 1 },
  stab: { attackSeconds: 0.004, holdSeconds: 0.35, releaseSeconds: 0.55, rateScale: 1 },
  // Synth FX envelopes track the generated sample lengths so tails ring out
  // (see scripts/make_pads_fx_samples.py).
  riser: { attackSeconds: 0.01, holdSeconds: 2.1, releaseSeconds: 0.35, rateScale: 1 },
  whoosh: { attackSeconds: 0.008, holdSeconds: 0.75, releaseSeconds: 0.3, rateScale: 1 },
  noiseBurst: { attackSeconds: 0.001, holdSeconds: 0.25, releaseSeconds: 0.12, rateScale: 1 },
  sweep: { attackSeconds: 0.004, holdSeconds: 1.05, releaseSeconds: 0.25, rateScale: 1 },
  subDrop: { attackSeconds: 0.002, holdSeconds: 1.25, releaseSeconds: 0.3, rateScale: 1 },
  reverse: { attackSeconds: 0.005, holdSeconds: 1.5, releaseSeconds: 0.15, rateScale: 1 },
  laser: { attackSeconds: 0.001, holdSeconds: 0.45, releaseSeconds: 0.15, rateScale: 1 },
  chordStab: { attackSeconds: 0.001, holdSeconds: 0.7, releaseSeconds: 0.2, rateScale: 1 },
  tapeStop: { attackSeconds: 0.002, holdSeconds: 1.15, releaseSeconds: 0.2, rateScale: 1 },
  boom: { attackSeconds: 0.001, holdSeconds: 1.45, releaseSeconds: 0.35, rateScale: 1 },
  short: { attackSeconds: 0.001, holdSeconds: 0.1, releaseSeconds: 0.08, rateScale: 1 },
  // Turkish percussion envelopes track scripts/make_turkish_perc_samples.py.
  turkDum: { attackSeconds: 0.001, holdSeconds: 0.5, releaseSeconds: 0.3, rateScale: 1 },
  turkTek: { attackSeconds: 0.001, holdSeconds: 0.28, releaseSeconds: 0.15, rateScale: 1 },
  turkKa: { attackSeconds: 0.001, holdSeconds: 0.22, releaseSeconds: 0.12, rateScale: 1 },
  turkSlap: { attackSeconds: 0.001, holdSeconds: 0.35, releaseSeconds: 0.2, rateScale: 1 },
  turkFlam: { attackSeconds: 0.001, holdSeconds: 0.6, releaseSeconds: 0.25, rateScale: 1 },
  turkBendir: { attackSeconds: 0.001, holdSeconds: 0.8, releaseSeconds: 0.4, rateScale: 1 },
  turkBuzz: { attackSeconds: 0.001, holdSeconds: 0.75, releaseSeconds: 0.35, rateScale: 1 },
  turkDef: { attackSeconds: 0.001, holdSeconds: 0.45, releaseSeconds: 0.25, rateScale: 1 },
  turkZil: { attackSeconds: 0.001, holdSeconds: 0.45, releaseSeconds: 0.25, rateScale: 1 },
  turkZilLong: { attackSeconds: 0.001, holdSeconds: 1.0, releaseSeconds: 0.35, rateScale: 1 },
} as const;

/** Envelope for user-recorded samples — generous ceiling, sample sets length. */
const USER_SAMPLE_ENV: PadHitEnvelope = {
  attackSeconds: 0.002,
  holdSeconds: 2.5,
  releaseSeconds: 0.5,
  rateScale: 1,
};

/** Melodic pads ring like plucked keys — longer than the FX stab envelope. */
const MELODIC_ENV: PadHitEnvelope = {
  attackSeconds: 0.002,
  holdSeconds: 1.1,
  releaseSeconds: 0.8,
  rateScale: 1,
};

function fileSlot(
  id: PadSoundId,
  labelKey: string,
  color: string,
  module: number,
  gain: number,
  envelope: PadHitEnvelope,
  extras?: Partial<Pick<PadSlotDef, 'bright' | 'chokeOpenHat'>> & { rateScale?: number },
): PadSlotDef {
  return {
    id,
    labelKey,
    color,
    source: { kind: 'file', module },
    gain,
    envelope: extras?.rateScale
      ? { ...envelope, rateScale: extras.rateScale }
      : envelope,
    bright: extras?.bright,
    chokeOpenHat: extras?.chokeOpenHat,
  };
}

function synthSlot(
  id: PadSoundId,
  labelKey: string,
  color: string,
  voice: PadSynthVoice,
  gain: number,
  envelope: PadHitEnvelope,
): PadSlotDef {
  return {
    id,
    labelKey,
    color,
    source: { kind: 'synth', voice },
    gain,
    envelope,
  };
}

function turkishSlot(
  id: PadSoundId,
  labelKey: string,
  color: string,
  voice: TurkishPercVoice,
  gain: number,
  envelope: PadHitEnvelope,
  rateScale = 1,
): PadSlotDef {
  return {
    id,
    labelKey,
    color,
    source: { kind: 'turkish', voice },
    gain,
    envelope: rateScale === 1 ? envelope : { ...envelope, rateScale },
  };
}

function pianoSlot(
  id: PadSoundId,
  labelKey: string,
  color: string,
  midi: number,
  gain = 0.95,
): PadSlotDef {
  return {
    id,
    labelKey,
    color,
    source: { kind: 'piano', midi },
    gain,
    envelope: MELODIC_ENV,
  };
}

/** C major pentatonic-ish ladder C3→C6 (pitched via piano anchors). */
const MELODIC_MIDI = [
  48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84,
] as const;

const MELODIC_LABELS = [
  'pads.labels.noteC3',
  'pads.labels.noteD3',
  'pads.labels.noteE3',
  'pads.labels.noteG3',
  'pads.labels.noteA3',
  'pads.labels.noteC4',
  'pads.labels.noteD4',
  'pads.labels.noteE4',
  'pads.labels.noteG4',
  'pads.labels.noteA4',
  'pads.labels.noteC5',
  'pads.labels.noteD5',
  'pads.labels.noteE5',
  'pads.labels.noteG5',
  'pads.labels.noteA5',
  'pads.labels.noteC6',
] as const;

const MELODIC_COLORS = [
  '#A78BFA',
  '#8B5CF6',
  '#7C3AED',
  '#38BDF8',
  '#0EA5E9',
  '#34D399',
  '#10B981',
  '#059669',
  '#FBBF24',
  '#F59E0B',
  '#FB7185',
  '#F43F5E',
  '#E11D48',
  '#F472B6',
  '#EC4899',
  '#DB2777',
];

const DRUMS_SLOTS: PadSlotDef[] = [
  fileSlot('pad01', 'pads.labels.kick', '#3D8BFF', PAD_SHARED_FILES.kick, 0.85, ENV.kick),
  fileSlot('pad02', 'pads.labels.snare', '#7B6CFF', PAD_SHARED_FILES.snare, 1.15, ENV.snare),
  fileSlot('pad03', 'pads.labels.hat', '#FFB347', PAD_SHARED_FILES.hat, 1.2, ENV.hat, {
    chokeOpenHat: true,
  }),
  fileSlot('pad04', 'pads.labels.hatOpen', '#FF7A59', PAD_SHARED_FILES.hatOpen, 1.15, ENV.hatOpen),
  fileSlot('pad05', 'pads.labels.tom', '#2EC4B6', PAD_SHARED_FILES.tomMid, 1.15, ENV.tom),
  fileSlot('pad06', 'pads.labels.clap', '#4ECDC4', PAD_SHARED_FILES.clap, 1.2, ENV.clap),
  fileSlot('pad07', 'pads.labels.crash', '#F4D35E', PAD_SHARED_FILES.crash, 0.78, ENV.crash, {
    bright: true,
  }),
  fileSlot('pad08', 'pads.labels.ride', '#EE964B', PAD_SHARED_FILES.ride, 1.05, ENV.ride, {
    bright: true,
  }),
  fileSlot('pad09', 'pads.labels.tomLow', '#2A9D8F', PAD_SHARED_FILES.tomLow, 1.15, ENV.tom),
  synthSlot('pad10', 'pads.labels.eightOhEight', '#457B9D', 'eightOhEight', 0.95, ENV.eight),
  fileSlot('pad11', 'pads.labels.tomHi', '#1ABC9C', PAD_SHARED_FILES.tomHi, 1.15, ENV.tom),
  fileSlot('pad12', 'pads.labels.impact', '#E76F51', PAD_SHARED_FILES.impact, 1.1, ENV.impact),
  fileSlot('pad13', 'pads.labels.rim', '#9B59B6', PAD_SHARED_FILES.snare, 1.05, ENV.short, {
    rateScale: 1.35,
  }),
  fileSlot('pad14', 'pads.labels.hatSoft', '#F4A261', PAD_SHARED_FILES.hat, 0.85, ENV.hat, {
    rateScale: 0.92,
  }),
  fileSlot('pad15', 'pads.labels.hatOpenShort', '#E9C46A', PAD_SHARED_FILES.hatOpen, 1.0, {
    attackSeconds: 0.002,
    holdSeconds: 0.22,
    releaseSeconds: 0.18,
    rateScale: 1.05,
  }),
  fileSlot('pad16', 'pads.labels.rideTip', '#C9A227', PAD_SHARED_FILES.ride, 0.95, ENV.short, {
    bright: true,
    rateScale: 1.15,
  }),
];

const MELODIC_SLOTS: PadSlotDef[] = PAD_SOUND_IDS.map((id, index) =>
  pianoSlot(id, MELODIC_LABELS[index], MELODIC_COLORS[index], MELODIC_MIDI[index]),
);

const FX_SLOTS: PadSlotDef[] = [
  fileSlot('pad01', 'pads.labels.clap', '#4ECDC4', PAD_SHARED_FILES.clap, 1.2, ENV.clap),
  fileSlot('pad02', 'pads.labels.impact', '#E76F51', PAD_SHARED_FILES.impact, 1.1, ENV.impact),
  fileSlot('pad03', 'pads.labels.crash', '#F4D35E', PAD_SHARED_FILES.crash, 0.78, ENV.crash, {
    bright: true,
  }),
  fileSlot('pad04', 'pads.labels.ride', '#EE964B', PAD_SHARED_FILES.ride, 1.05, ENV.ride, {
    bright: true,
  }),
  synthSlot('pad05', 'pads.labels.eightOhEight', '#457B9D', 'eightOhEight', 0.95, ENV.eight),
  synthSlot('pad06', 'pads.labels.riser', '#6C5CE7', 'riser', 0.85, ENV.riser),
  synthSlot('pad07', 'pads.labels.whoosh', '#A78BFA', 'whoosh', 0.9, ENV.whoosh),
  synthSlot('pad08', 'pads.labels.reverse', '#8E44AD', 'reverse', 0.85, ENV.reverse),
  synthSlot('pad09', 'pads.labels.tick', '#38BDF8', 'tick', 1.0, ENV.short),
  synthSlot('pad10', 'pads.labels.sweep', '#0EA5E9', 'sweep', 0.9, ENV.sweep),
  synthSlot('pad11', 'pads.labels.subDrop', '#264653', 'subDrop', 1.0, ENV.subDrop),
  synthSlot('pad12', 'pads.labels.noise', '#F4A261', 'noise', 0.85, ENV.noiseBurst),
  synthSlot('pad13', 'pads.labels.laser', '#48DBFB', 'laser', 0.85, ENV.laser),
  synthSlot('pad14', 'pads.labels.stab', '#9B59B6', 'stab', 0.9, ENV.chordStab),
  synthSlot('pad15', 'pads.labels.tapeStop', '#E9C46A', 'tapeStop', 0.85, ENV.tapeStop),
  synthSlot('pad16', 'pads.labels.boom', '#E74C3C', 'boom', 0.95, ENV.boom),
];

const TURKISH_SLOTS: PadSlotDef[] = [
  turkishSlot('pad01', 'pads.labels.turkDum', '#E07A1F', 'darbukaDum', 1.0, ENV.turkDum),
  turkishSlot('pad02', 'pads.labels.turkTek', '#F2A65A', 'darbukaTek', 0.95, ENV.turkTek),
  turkishSlot('pad03', 'pads.labels.turkKa', '#F7C873', 'darbukaKa', 0.9, ENV.turkKa),
  turkishSlot('pad04', 'pads.labels.turkSlap', '#E85D4A', 'darbukaSlap', 1.0, ENV.turkSlap),
  turkishSlot('pad05', 'pads.labels.turkDeepDum', '#B85C1E', 'darbukaDum', 1.05, ENV.turkDum, 0.85),
  turkishSlot('pad06', 'pads.labels.turkFlam', '#D96C3F', 'darbukaFlam', 0.95, ENV.turkFlam),
  turkishSlot('pad07', 'pads.labels.turkBendirDum', '#8C5A2B', 'bendirDum', 1.05, ENV.turkBendir),
  turkishSlot('pad08', 'pads.labels.turkBendirTek', '#A9743C', 'bendirTek', 0.95, ENV.turkTek),
  turkishSlot('pad09', 'pads.labels.turkBendirBuzz', '#C08552', 'bendirBuzz', 1.0, ENV.turkBuzz),
  turkishSlot('pad10', 'pads.labels.turkDef', '#D9A441', 'defHit', 0.95, ENV.turkDef),
  turkishSlot('pad11', 'pads.labels.turkDefJingle', '#E8C15A', 'defJingle', 0.85, ENV.turkZil),
  turkishSlot('pad12', 'pads.labels.turkDefSlap', '#CE8F35', 'defSlap', 0.95, ENV.turkDef),
  turkishSlot('pad13', 'pads.labels.turkKasik', '#9C6644', 'kasik', 0.9, ENV.short),
  turkishSlot('pad14', 'pads.labels.turkKasikDouble', '#B07D4F', 'kasikDouble', 0.9, ENV.turkKa),
  turkishSlot('pad15', 'pads.labels.turkZilliMasa', '#C9B037', 'zilliMasa', 0.85, ENV.turkZil),
  turkishSlot('pad16', 'pads.labels.turkZilliMasaLong', '#E0CB5B', 'zilliMasaLong', 0.85, ENV.turkZilLong),
];

export const PAD_BANKS: PadBankDefinition[] = [
  {
    id: 'drums',
    icon: '🥁',
    labelKey: 'pads.banks.drums',
    theme: {
      accent: '#2A9D8F',
      stageBg: '#141820',
      stageOverlay: '#1C2330',
    },
    audio: {
      playbackRate: 1,
      gainScale: 1,
      filterType: 'peaking',
      filterFrequency: 1000,
      filterQ: 0.7,
    },
    slots: DRUMS_SLOTS,
  },
  {
    id: 'melodic',
    icon: '🎹',
    labelKey: 'pads.banks.melodic',
    theme: {
      accent: '#8B5CF6',
      stageBg: '#120E1A',
      stageOverlay: '#1E1630',
    },
    audio: {
      playbackRate: 1,
      gainScale: 0.95,
      filterType: 'lowpass',
      filterFrequency: 9000,
      filterQ: 0.5,
    },
    slots: MELODIC_SLOTS,
  },
  {
    id: 'fx',
    icon: '✨',
    labelKey: 'pads.banks.fx',
    theme: {
      accent: '#E76F51',
      stageBg: '#1A1010',
      stageOverlay: '#2A1818',
    },
    audio: {
      playbackRate: 1,
      gainScale: 1.05,
      filterType: 'highpass',
      filterFrequency: 60,
      filterQ: 0.7,
    },
    slots: FX_SLOTS,
  },
  {
    id: 'turkish',
    icon: '🪘',
    labelKey: 'pads.banks.turkish',
    theme: {
      accent: '#D97706',
      stageBg: '#191008',
      stageOverlay: '#2A1B0E',
    },
    audio: {
      playbackRate: 1,
      gainScale: 1,
      filterType: 'peaking',
      filterFrequency: 900,
      filterQ: 0.7,
    },
    slots: TURKISH_SLOTS,
  },
];

// --- Custom bank ("Benim Bankım") ------------------------------------------
// Slots are user-configured (persisted in padsCustomBankStorage) and pushed
// into this module cache — bank resolution stays synchronous for the engine.

export type CustomSlotSource =
  | { kind: 'builtin'; bankId: Exclude<PadBankId, 'custom'>; padId: PadSoundId }
  | { kind: 'user'; uri: string };

export type CustomPadSlot = {
  source: CustomSlotSource;
  color: string;
  /** 0.2..1.4 — final hit gain. */
  gain: number;
  /** -12..12 semitones — multiplies playback rate by 2^(n/12). */
  pitchSemitones: number;
  chokeGroup?: PadChokeGroup;
  /** Optional literal display label (not translated). */
  label?: string;
};

export const CUSTOM_BANK_THEME: PadBankTheme = {
  accent: '#00D1B2',
  stageBg: '#0A1414',
  stageOverlay: '#12211F',
};

export function createDefaultCustomPadSlots(): CustomPadSlot[] {
  return DRUMS_SLOTS.map((slot) => ({
    source: { kind: 'builtin', bankId: 'drums', padId: slot.id },
    color: slot.color,
    gain: 1,
    pitchSemitones: 0,
  }));
}

let customSlots: CustomPadSlot[] = createDefaultCustomPadSlots();
let customDefinition: PadBankDefinition | null = null;

function pitchRateScale(semitones: number): number {
  return 2 ** (Math.max(-12, Math.min(12, semitones)) / 12);
}

/** Resolve a builtin reference to its slot definition (never 'custom'). */
export function getBuiltinPadSlot(
  bankId: Exclude<PadBankId, 'custom'>,
  padId: PadSoundId,
): PadSlotDef {
  const bank = PAD_BANKS.find((entry) => entry.id === bankId) ?? PAD_BANKS[0];
  return bank.slots.find((slot) => slot.id === padId) ?? bank.slots[0];
}

function buildCustomSlotDef(slot: CustomPadSlot, index: number): PadSlotDef {
  const id = PAD_SOUND_IDS[index];
  const rate = pitchRateScale(slot.pitchSemitones);
  const gain = Math.max(0.2, Math.min(1.4, slot.gain));

  if (slot.source.kind === 'user') {
    return {
      id,
      labelKey: 'pads.labels.userSample',
      rawLabel: slot.label,
      color: slot.color,
      source: { kind: 'user', uri: slot.source.uri },
      gain,
      envelope: { ...USER_SAMPLE_ENV, rateScale: rate },
      chokeGroup: slot.chokeGroup,
    };
  }

  const base = getBuiltinPadSlot(slot.source.bankId, slot.source.padId);
  return {
    id,
    labelKey: base.labelKey,
    rawLabel: slot.label,
    color: slot.color,
    source: base.source,
    gain: base.gain * gain,
    envelope: { ...base.envelope, rateScale: base.envelope.rateScale * rate },
    bright: base.bright,
    // Keep the closed-hat behaviour when the drums mapping is carried over —
    // the choke targets the custom bank's own pad04 (bank-scoped tags).
    chokeOpenHat: base.chokeOpenHat,
    chokeGroup: slot.chokeGroup,
  };
}

/** Public wrapper — the pad editor previews draft slots through this. */
export function resolveCustomSlotDef(slot: CustomPadSlot, index: number): PadSlotDef {
  return buildCustomSlotDef(slot, index);
}

function buildCustomDefinition(): PadBankDefinition {
  const slots = customSlots.map((slot, index) => buildCustomSlotDef(slot, index));

  // The closed-hat choke hard-targets this bank's pad04. Keep it only while
  // pad04 actually holds an open-hat sound — otherwise a remapped closed hat
  // would silence whatever the user placed there (e.g. their own recording).
  const pad04 = slots[3];
  const pad04IsOpenHat =
    pad04?.source.kind === 'file' && pad04.source.module === PAD_SHARED_FILES.hatOpen;
  const safeSlots = pad04IsOpenHat
    ? slots
    : slots.map((slot) => (slot.chokeOpenHat ? { ...slot, chokeOpenHat: false } : slot));

  return {
    id: 'custom',
    icon: '🎛️',
    labelKey: 'pads.banks.custom',
    theme: CUSTOM_BANK_THEME,
    audio: {
      playbackRate: 1,
      gainScale: 1,
      filterType: 'peaking',
      filterFrequency: 1000,
      filterQ: 0.7,
    },
    slots: safeSlots,
  };
}

export function getCustomPadSlots(): CustomPadSlot[] {
  return customSlots;
}

export function setCustomPadSlots(slots: CustomPadSlot[]): void {
  customSlots = slots.slice(0, PAD_SOUND_IDS.length);
  while (customSlots.length < PAD_SOUND_IDS.length) {
    customSlots.push(createDefaultCustomPadSlots()[customSlots.length]);
  }
  customDefinition = null;
}

// ---------------------------------------------------------------------------

export function isPadBankId(value: unknown): value is PadBankId {
  return typeof value === 'string' && (PAD_BANK_IDS as string[]).includes(value);
}

export function getPadBank(id: PadBankId): PadBankDefinition {
  if (id === 'custom') {
    if (!customDefinition) {
      customDefinition = buildCustomDefinition();
    }
    return customDefinition;
  }
  return PAD_BANKS.find((bank) => bank.id === id) ?? PAD_BANKS[0];
}

/** Every pickable bank, custom last. */
export function getSelectableBankDefinitions(): PadBankDefinition[] {
  return [...PAD_BANKS, getPadBank('custom')];
}

export function getPadSlot(bankId: PadBankId, padId: PadSoundId): PadSlotDef {
  const bank = getPadBank(bankId);
  return bank.slots.find((slot) => slot.id === padId) ?? bank.slots[0];
}

export function getLaunchPads(bankId: PadBankId): LaunchPadDefinition[] {
  return getPadBank(bankId).slots.map((slot) => ({
    id: slot.id,
    labelKey: slot.labelKey,
    rawLabel: slot.rawLabel,
    color: slot.color,
  }));
}

/** Collect unique file/synth module ids needed to warm the sample cache. */
export function collectBankFileModules(bank: PadBankDefinition): number[] {
  const modules = new Set<number>();
  for (const slot of bank.slots) {
    if (slot.source.kind === 'file') {
      modules.add(slot.source.module);
    } else if (slot.source.kind === 'synth') {
      modules.add(PAD_SYNTH_FILES[slot.source.voice]);
    } else if (slot.source.kind === 'turkish') {
      modules.add(TURKISH_PERC_FILES[slot.source.voice]);
    }
  }
  return [...modules];
}

/** Collect user-sample URIs a bank needs (custom bank recordings). */
export function collectBankUserUris(bank: PadBankDefinition): string[] {
  const uris = new Set<string>();
  for (const slot of bank.slots) {
    if (slot.source.kind === 'user') {
      uris.add(slot.source.uri);
    }
  }
  return [...uris];
}
