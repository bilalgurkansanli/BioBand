// Drum kit “voices”: same samples, different playback character + stage look.
// No extra assets — rate / filter / gain shape the kit (like piano bright/synth).

export type DrumKitId =
  | 'acoustic'
  | 'punch'
  | 'electronic'
  | 'room'
  | 'vintage'
  | 'lofi';

export type DrumKitTheme = {
  accent: string;
  stageBg: string;
  stageOverlay: string;
};

export type DrumKitAudio = {
  playbackRate: number;
  gainScale: number;
  filterType: 'lowpass' | 'highpass' | 'peaking' | 'lowshelf';
  filterFrequency: number;
  filterQ: number;
};

export type DrumKitDefinition = {
  id: DrumKitId;
  icon: string;
  labelKey: string;
  theme: DrumKitTheme;
  audio: DrumKitAudio;
};

export const DRUM_KITS: DrumKitDefinition[] = [
  {
    id: 'acoustic',
    icon: '🥁',
    labelKey: 'drums.kits.acoustic',
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
  },
  {
    id: 'punch',
    icon: '💥',
    labelKey: 'drums.kits.punch',
    theme: {
      accent: '#E76F51',
      stageBg: '#1A1010',
      stageOverlay: '#2A1818',
    },
    audio: {
      playbackRate: 1.02,
      gainScale: 1.12,
      filterType: 'lowshelf',
      filterFrequency: 120,
      filterQ: 0.7,
    },
  },
  {
    id: 'electronic',
    icon: '⚡',
    labelKey: 'drums.kits.electronic',
    theme: {
      accent: '#6C5CE7',
      stageBg: '#0E1020',
      stageOverlay: '#1A1E38',
    },
    audio: {
      playbackRate: 1.06,
      gainScale: 1.05,
      filterType: 'highpass',
      filterFrequency: 90,
      filterQ: 0.85,
    },
  },
  {
    id: 'room',
    icon: '🏛️',
    labelKey: 'drums.kits.room',
    theme: {
      accent: '#E9C46A',
      stageBg: '#161410',
      stageOverlay: '#242018',
    },
    audio: {
      playbackRate: 0.99,
      gainScale: 0.92,
      filterType: 'lowpass',
      filterFrequency: 7500,
      filterQ: 0.6,
    },
  },
  {
    id: 'vintage',
    icon: '📼',
    labelKey: 'drums.kits.vintage',
    theme: {
      accent: '#C9A227',
      stageBg: '#18140C',
      stageOverlay: '#2A2214',
    },
    audio: {
      playbackRate: 0.97,
      gainScale: 0.95,
      filterType: 'lowpass',
      filterFrequency: 4200,
      filterQ: 0.8,
    },
  },
  {
    id: 'lofi',
    icon: '📻',
    labelKey: 'drums.kits.lofi',
    theme: {
      accent: '#F4A261',
      stageBg: '#12100E',
      stageOverlay: '#221C18',
    },
    audio: {
      playbackRate: 0.94,
      gainScale: 0.9,
      filterType: 'lowpass',
      filterFrequency: 2800,
      filterQ: 1.1,
    },
  },
];

export function getDrumKit(id: DrumKitId): DrumKitDefinition {
  return DRUM_KITS.find((kit) => kit.id === id) ?? DRUM_KITS[0];
}
