// Violin voices: same sample bank + EQ/envelope character + stage theme.

export type ViolinVoiceId =
  | 'classic'
  | 'bright'
  | 'muted'
  | 'warm'
  | 'airy'
  | 'electric';

export type ViolinFingerboardColors = {
  /** Ebony playing surface. */
  board: string;
  /** Warm maple / spruce rim around the board. */
  wood: string;
  /** Outer wood edge highlight. */
  woodEdge: string;
  /** Bone / ivory nut strip. */
  nut: string;
  /** Bridge wood tone. */
  bridge: string;
  /** Idle string wire. */
  string: string;
  /** Soft finger-position guide dots on the board. */
  positionDot: string;
  /** String name labels. */
  label: string;
  /** Position number header. */
  positionLabel: string;
};

export type ViolinVoiceTheme = {
  accent: string;
  stageBg: string;
  stageOverlay: string;
  fingerboard: ViolinFingerboardColors;
};

export type ViolinVoiceAudio = {
  playbackRate: number;
  gainScale: number;
  filterType: 'lowpass' | 'highpass' | 'peaking' | 'lowshelf';
  filterFrequency: number;
  filterQ: number;
  filterGainDb?: number;
  holdSeconds?: number;
  releaseSeconds?: number;
};

export type ViolinVoiceDefinition = {
  id: ViolinVoiceId;
  icon: string;
  labelKey: string;
  theme: ViolinVoiceTheme;
  audio: ViolinVoiceAudio;
};

export const VIOLIN_VOICES: ViolinVoiceDefinition[] = [
  {
    id: 'classic',
    icon: '🎻',
    labelKey: 'violin.voices.classic',
    theme: {
      accent: '#D4AF6A',
      stageBg: '#120E0A',
      stageOverlay: '#2A1C12',
      fingerboard: {
        board: '#14110E',
        wood: '#5C3A22',
        woodEdge: '#8B5A32',
        nut: '#E8DCC8',
        bridge: '#6B4428',
        string: '#C8B896',
        positionDot: '#2A2420',
        label: '#F0E0C0',
        positionLabel: '#A89070',
      },
    },
    audio: {
      playbackRate: 1,
      gainScale: 1,
      filterType: 'lowpass',
      filterFrequency: 9800,
      filterQ: 0.45,
      // Notes enter at the sample's developed-tone offset, so the stroke is
      // full from the start — ~0.85s total reads as a crisp bow.
      holdSeconds: 0.45,
      releaseSeconds: 0.4,
    },
  },
  {
    id: 'bright',
    icon: '✨',
    labelKey: 'violin.voices.bright',
    theme: {
      accent: '#8ECAE6',
      stageBg: '#0C1216',
      stageOverlay: '#1A2830',
      fingerboard: {
        board: '#101820',
        wood: '#3A4A55',
        woodEdge: '#6A8494',
        nut: '#D8E4EC',
        bridge: '#4A5A66',
        string: '#B0C4D0',
        positionDot: '#1A2830',
        label: '#D0E4F0',
        positionLabel: '#7A98A8',
      },
    },
    audio: {
      // Pitch-neutral: character comes from the EQ, not detune — the old
      // +14-cent rate sounded out of tune next to other instruments.
      playbackRate: 1,
      gainScale: 1.04,
      filterType: 'highpass',
      filterFrequency: 140,
      filterQ: 0.6,
      holdSeconds: 0.4,
      releaseSeconds: 0.35,
    },
  },
  {
    id: 'muted',
    icon: '🔇',
    labelKey: 'violin.voices.muted',
    theme: {
      accent: '#90A4AE',
      stageBg: '#0E1010',
      stageOverlay: '#1A1E1E',
      fingerboard: {
        board: '#121414',
        wood: '#3A3E3E',
        woodEdge: '#5A6262',
        nut: '#D0D4D4',
        bridge: '#454A4A',
        string: '#9AA0A0',
        positionDot: '#1C2020',
        label: '#C8CCCC',
        positionLabel: '#7A8484',
      },
    },
    audio: {
      // Sordino-like: duller highs and the shortest bow of the set — but
      // still long enough to hear actual tone.
      playbackRate: 1,
      gainScale: 0.9,
      filterType: 'lowpass',
      filterFrequency: 2200,
      filterQ: 0.95,
      holdSeconds: 0.2,
      releaseSeconds: 0.25,
    },
  },
  {
    id: 'warm',
    icon: '🔥',
    labelKey: 'violin.voices.warm',
    theme: {
      accent: '#E07650',
      stageBg: '#120A08',
      stageOverlay: '#281410',
      fingerboard: {
        board: '#160E0C',
        wood: '#6B2E1E',
        woodEdge: '#A04830',
        nut: '#F0D8C8',
        bridge: '#7A3828',
        string: '#D0A090',
        positionDot: '#2A1814',
        label: '#F0C8B8',
        positionLabel: '#B87868',
      },
    },
    audio: {
      playbackRate: 1,
      gainScale: 1,
      filterType: 'lowshelf',
      filterFrequency: 280,
      filterQ: 0.7,
      filterGainDb: 3.2,
      // Longest bow of the set — warm legato character.
      holdSeconds: 0.55,
      releaseSeconds: 0.45,
    },
  },
  {
    id: 'airy',
    icon: '🌬️',
    labelKey: 'violin.voices.airy',
    theme: {
      accent: '#E8B86A',
      stageBg: '#141008',
      stageOverlay: '#2A2010',
      fingerboard: {
        board: '#16120A',
        wood: '#6B5028',
        woodEdge: '#A88840',
        nut: '#F4E8C8',
        bridge: '#7A6230',
        string: '#D8C090',
        positionDot: '#2A2414',
        label: '#F8E8C0',
        positionLabel: '#C8A868',
      },
    },
    audio: {
      playbackRate: 1,
      gainScale: 1.02,
      filterType: 'highpass',
      filterFrequency: 100,
      filterQ: 0.5,
      holdSeconds: 0.42,
      releaseSeconds: 0.38,
    },
  },
  {
    id: 'electric',
    icon: '⚡',
    labelKey: 'violin.voices.electric',
    theme: {
      accent: '#8B7CFF',
      stageBg: '#080A14',
      stageOverlay: '#141828',
      fingerboard: {
        board: '#0C0E18',
        wood: '#2A2850',
        woodEdge: '#5A50A0',
        nut: '#D8D4F0',
        bridge: '#3A3860',
        string: '#A8A0D0',
        positionDot: '#181828',
        label: '#D8D0FF',
        positionLabel: '#8A90B0',
      },
    },
    audio: {
      playbackRate: 1,
      gainScale: 1.06,
      filterType: 'peaking',
      filterFrequency: 2100,
      filterQ: 0.9,
      filterGainDb: 4,
      holdSeconds: 0.32,
      releaseSeconds: 0.3,
    },
  },
];

export function getViolinVoice(id: ViolinVoiceId): ViolinVoiceDefinition {
  return VIOLIN_VOICES.find((voice) => voice.id === id) ?? VIOLIN_VOICES[0];
}

export function isViolinVoiceId(value: unknown): value is ViolinVoiceId {
  return (
    typeof value === 'string' && VIOLIN_VOICES.some((voice) => voice.id === value)
  );
}
