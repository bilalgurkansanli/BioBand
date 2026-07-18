import { PAD_SHARED_FILES, PAD_SOUND_IDS, type LaunchPadDefinition, type PadSoundId } from './padsSounds';
import { PAD_SYNTH_FILES, type PadSynthVoice } from './padsSynth';

export type PadBankId = 'drums' | 'melodic' | 'fx';

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
  | { kind: 'synth'; voice: PadSynthVoice };

export type PadSlotDef = {
  id: PadSoundId;
  labelKey: string;
  color: string;
  source: PadSlotSource;
  gain: number;
  envelope: PadHitEnvelope;
  /** Route through bright (cymbal) tone filter. */
  bright?: boolean;
  /** Closed-hat style choke of open hat (pad04). */
  chokeOpenHat?: boolean;
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
  eight: { attackSeconds: 0.002, holdSeconds: 0.45, releaseSeconds: 0.55, rateScale: 1 },
  impact: { attackSeconds: 0.002, holdSeconds: 0.4, releaseSeconds: 0.45, rateScale: 1 },
  stab: { attackSeconds: 0.004, holdSeconds: 0.35, releaseSeconds: 0.55, rateScale: 1 },
  riser: { attackSeconds: 0.01, holdSeconds: 1.0, releaseSeconds: 0.35, rateScale: 1 },
  whoosh: { attackSeconds: 0.008, holdSeconds: 0.35, releaseSeconds: 0.25, rateScale: 1 },
  short: { attackSeconds: 0.001, holdSeconds: 0.1, releaseSeconds: 0.08, rateScale: 1 },
} as const;

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
    envelope: ENV.stab,
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
  fileSlot('pad08', 'pads.labels.reverse', '#8E44AD', PAD_SHARED_FILES.crash, 0.7, {
    attackSeconds: 0.08,
    holdSeconds: 0.35,
    releaseSeconds: 0.5,
    rateScale: 0.72,
  }, { bright: true }),
  synthSlot('pad09', 'pads.labels.tick', '#38BDF8', 'tick', 1.0, ENV.short),
  synthSlot('pad10', 'pads.labels.sweep', '#0EA5E9', 'sweep', 0.9, ENV.whoosh),
  synthSlot('pad11', 'pads.labels.subDrop', '#264653', 'subDrop', 0.95, ENV.eight),
  synthSlot('pad12', 'pads.labels.noise', '#F4A261', 'noise', 0.85, ENV.short),
  fileSlot('pad13', 'pads.labels.crash', '#E9C46A', PAD_SHARED_FILES.crash, 0.65, ENV.crash, {
    bright: true,
    rateScale: 1.08,
  }),
  fileSlot('pad14', 'pads.labels.ride', '#C9A227', PAD_SHARED_FILES.ride, 0.9, ENV.ride, {
    bright: true,
    rateScale: 0.9,
  }),
  synthSlot('pad15', 'pads.labels.whoosh', '#9B59B6', 'whoosh', 0.8, {
    ...ENV.whoosh,
    rateScale: 1.2,
  }),
  synthSlot('pad16', 'pads.labels.riser', '#E74C3C', 'riser', 0.75, {
    ...ENV.riser,
    rateScale: 1.15,
  }),
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
];

export function getPadBank(id: PadBankId): PadBankDefinition {
  return PAD_BANKS.find((bank) => bank.id === id) ?? PAD_BANKS[0];
}

export function getPadSlot(bankId: PadBankId, padId: PadSoundId): PadSlotDef {
  const bank = getPadBank(bankId);
  return bank.slots.find((slot) => slot.id === padId) ?? bank.slots[0];
}

export function getLaunchPads(bankId: PadBankId): LaunchPadDefinition[] {
  return getPadBank(bankId).slots.map((slot) => ({
    id: slot.id,
    labelKey: slot.labelKey,
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
    }
  }
  return [...modules];
}
