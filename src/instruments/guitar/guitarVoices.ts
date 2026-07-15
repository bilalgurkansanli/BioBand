// Guitar “voices”: same open-string samples, different playback character + look.
// No extra assets — rate / filter / gain shape the voice (like drums kits).

export type GuitarVoiceId =
  | 'nylon'
  | 'steel'
  | 'muted'
  | 'bright'
  | 'warm'
  | 'electric';

export type GuitarVoiceTheme = {
  accent: string;
  stageBg: string;
  stageOverlay: string;
};

export type GuitarVoiceAudio = {
  playbackRate: number;
  gainScale: number;
  filterType: 'lowpass' | 'highpass' | 'peaking' | 'lowshelf';
  filterFrequency: number;
  filterQ: number;
};

export type GuitarVoiceDefinition = {
  id: GuitarVoiceId;
  icon: string;
  labelKey: string;
  theme: GuitarVoiceTheme;
  audio: GuitarVoiceAudio;
};

export const GUITAR_VOICES: GuitarVoiceDefinition[] = [
  {
    id: 'nylon',
    icon: '🎸',
    labelKey: 'guitar.voices.nylon',
    theme: {
      accent: '#C4A35A',
      stageBg: '#16120E',
      stageOverlay: '#241C14',
    },
    audio: {
      playbackRate: 1,
      gainScale: 1,
      filterType: 'peaking',
      filterFrequency: 900,
      filterQ: 0.7,
    },
  },
  {
    id: 'steel',
    icon: '✨',
    labelKey: 'guitar.voices.steel',
    theme: {
      accent: '#8ECAE6',
      stageBg: '#101418',
      stageOverlay: '#1A2228',
    },
    audio: {
      playbackRate: 1.02,
      gainScale: 1.05,
      filterType: 'highpass',
      filterFrequency: 80,
      filterQ: 0.8,
    },
  },
  {
    id: 'muted',
    icon: '🔇',
    labelKey: 'guitar.voices.muted',
    theme: {
      accent: '#90A4AE',
      stageBg: '#121414',
      stageOverlay: '#1C2020',
    },
    audio: {
      playbackRate: 0.98,
      gainScale: 0.88,
      filterType: 'lowpass',
      filterFrequency: 2200,
      filterQ: 1.0,
    },
  },
  {
    id: 'bright',
    icon: '☀️',
    labelKey: 'guitar.voices.bright',
    theme: {
      accent: '#F4A261',
      stageBg: '#18140C',
      stageOverlay: '#2A2214',
    },
    audio: {
      playbackRate: 1.04,
      gainScale: 1.08,
      filterType: 'highpass',
      filterFrequency: 120,
      filterQ: 0.75,
    },
  },
  {
    id: 'warm',
    icon: '🔥',
    labelKey: 'guitar.voices.warm',
    theme: {
      accent: '#E76F51',
      stageBg: '#160E0C',
      stageOverlay: '#241814',
    },
    audio: {
      playbackRate: 0.99,
      gainScale: 0.95,
      filterType: 'lowshelf',
      filterFrequency: 200,
      filterQ: 0.7,
    },
  },
  {
    id: 'electric',
    icon: '⚡',
    labelKey: 'guitar.voices.electric',
    theme: {
      accent: '#6C5CE7',
      stageBg: '#0E1020',
      stageOverlay: '#1A1E38',
    },
    audio: {
      playbackRate: 1.05,
      gainScale: 1.1,
      filterType: 'peaking',
      filterFrequency: 1800,
      filterQ: 1.2,
    },
  },
];

export function getGuitarVoice(id: GuitarVoiceId): GuitarVoiceDefinition {
  return GUITAR_VOICES.find((voice) => voice.id === id) ?? GUITAR_VOICES[0];
}
