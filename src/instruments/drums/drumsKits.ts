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
  /** Tom / kick shell wrap color. */
  shell: string;
  /** Cymbal alloy base (crash; ride/hats derive darker shades). */
  cymbal: string;
  /** Drum head (batter) color. */
  head: string;
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
      stageBg: '#0F211F',
      stageOverlay: '#17342F',
      // Classic: teal wrap, gold cymbals, coated cream heads.
      shell: '#2F8F84',
      cymbal: '#D4A72C',
      head: '#F2EEE2',
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
      stageBg: '#25100C',
      stageOverlay: '#3A1A16',
      // Rock: candy-red wrap, warm brass, warm cream heads.
      shell: '#C33A2A',
      cymbal: '#C79A2E',
      head: '#F5E8D6',
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
      stageBg: '#10122E',
      stageOverlay: '#1E2252',
      // E-kit: violet shells, steel cymbals, dark mesh heads.
      shell: '#6C5CE7',
      cymbal: '#A8B0C2',
      head: '#333A50',
    },
    // Electronic plays real 808 one-shots (KIT_SOUND_OVERRIDES) — keep the
    // bus neutral so the synthesized lows (48 Hz kick) pass untouched.
    audio: {
      playbackRate: 1,
      gainScale: 1.05,
      filterType: 'peaking',
      filterFrequency: 1000,
      filterQ: 0.7,
    },
  },
  {
    id: 'room',
    icon: '🏛️',
    labelKey: 'drums.kits.room',
    theme: {
      accent: '#E9C46A',
      stageBg: '#221A0F',
      stageOverlay: '#362A18',
      // Studio room: walnut wrap, warm gold, natural heads.
      shell: '#8B5A2B',
      cymbal: '#DAA733',
      head: '#F0EAD8',
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
      stageBg: '#211A08',
      stageOverlay: '#382D10',
      // 60s: oyster pearl wrap, aged bronze, aged coated heads.
      shell: '#D8C9A6',
      cymbal: '#B08A2A',
      head: '#EBE2CC',
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
      stageBg: '#20140D',
      stageOverlay: '#332117',
      // Dusty bedroom kit: clay wrap, dull brass, sun-faded heads.
      shell: '#A9705A',
      cymbal: '#9C7F35',
      head: '#E6DCC8',
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

export function isDrumKitId(value: unknown): value is DrumKitId {
  return typeof value === 'string' && DRUM_KITS.some((kit) => kit.id === value);
}
