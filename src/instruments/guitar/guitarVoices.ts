// Guitar voices: acoustic bank + EQ for most; electric uses real electric samples.
// Each voice pairs audio character with a stage/fretboard look (like piano voices).

export type GuitarVoiceId =
  | 'nylon'
  | 'steel'
  | 'muted'
  | 'bright'
  | 'warm'
  | 'electric';

export type GuitarFretboardColors = {
  /** Open-string (nut) column. */
  nut: string;
  /** Inlay marker frets (3/5/7/9/12). */
  marker: string;
  /** Vertical fret-cell borders. */
  cellBorder: string;
  /** Nut metal edge. */
  nutEdge: string;
  /** Idle string wire color. */
  stringIdle: string;
  /** Board strip behind the strings. */
  board: string;
};

export type GuitarVoiceTheme = {
  /** Toolbar voice icon + selection / guide / chord accents. */
  accent: string;
  /** Full stage backdrop. */
  stageBg: string;
  /** Soft wash over the board (drums-style). */
  stageOverlay: string;
  fretboard: GuitarFretboardColors;
};

export type GuitarVoiceAudio = {
  playbackRate: number;
  gainScale: number;
  filterType: 'lowpass' | 'highpass' | 'peaking' | 'lowshelf';
  filterFrequency: number;
  filterQ: number;
  /** dB for peaking / lowshelf (default 0 / 3). */
  filterGainDb?: number;
  holdSeconds?: number;
  releaseSeconds?: number;
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
    // Classic acoustic: warm spruce / rosewood.
    theme: {
      accent: '#C4A35A',
      stageBg: '#16120E',
      stageOverlay: '#2A2218',
      fretboard: {
        nut: '#2A2218',
        marker: '#241C14',
        cellBorder: '#3D3228',
        nutEdge: '#D4C4A8',
        stringIdle: '#A89878',
        board: '#1C1610',
      },
    },
    audio: {
      playbackRate: 1,
      gainScale: 1,
      filterType: 'lowpass',
      filterFrequency: 9200,
      filterQ: 0.5,
      holdSeconds: 3.4,
      releaseSeconds: 2.4,
    },
  },
  {
    id: 'steel',
    icon: '✨',
    labelKey: 'guitar.voices.steel',
    // Bright steel-string: cool blue stage, silver wires.
    theme: {
      accent: '#8ECAE6',
      stageBg: '#0E1418',
      stageOverlay: '#1A2830',
      fretboard: {
        nut: '#1A2428',
        marker: '#162028',
        cellBorder: '#2A3A44',
        nutEdge: '#C8D8E0',
        stringIdle: '#9AB0BC',
        board: '#121A20',
      },
    },
    audio: {
      playbackRate: 1,
      gainScale: 1.02,
      filterType: 'highpass',
      filterFrequency: 70,
      filterQ: 0.6,
      holdSeconds: 3.0,
      releaseSeconds: 2.0,
    },
  },
  {
    id: 'muted',
    icon: '🔇',
    labelKey: 'guitar.voices.muted',
    // Palm-mute studio: flat charcoal.
    theme: {
      accent: '#90A4AE',
      stageBg: '#101212',
      stageOverlay: '#1A1E1E',
      fretboard: {
        nut: '#1C2020',
        marker: '#181C1C',
        cellBorder: '#2E3434',
        nutEdge: '#A0A8A8',
        stringIdle: '#7A8484',
        board: '#141818',
      },
    },
    audio: {
      playbackRate: 1,
      gainScale: 0.9,
      filterType: 'lowpass',
      filterFrequency: 2800,
      filterQ: 0.85,
      holdSeconds: 0.35,
      releaseSeconds: 0.25,
    },
  },
  {
    id: 'bright',
    icon: '☀️',
    labelKey: 'guitar.voices.bright',
    // Sunny stage: honey maple + amber accents.
    theme: {
      accent: '#F4A261',
      stageBg: '#18140C',
      stageOverlay: '#2E2414',
      fretboard: {
        nut: '#2A2210',
        marker: '#241C0E',
        cellBorder: '#4A3A20',
        nutEdge: '#F0D090',
        stringIdle: '#C8A868',
        board: '#1E180C',
      },
    },
    audio: {
      playbackRate: 1.01,
      gainScale: 1.05,
      filterType: 'highpass',
      filterFrequency: 110,
      filterQ: 0.65,
      holdSeconds: 2.8,
      releaseSeconds: 1.8,
    },
  },
  {
    id: 'warm',
    icon: '🔥',
    labelKey: 'guitar.voices.warm',
    // Mahogany body: deep ember reds.
    theme: {
      accent: '#E76F51',
      stageBg: '#140C0A',
      stageOverlay: '#281814',
      fretboard: {
        nut: '#2A1814',
        marker: '#221410',
        cellBorder: '#4A2820',
        nutEdge: '#E8A090',
        stringIdle: '#B87868',
        board: '#1A100E',
      },
    },
    audio: {
      playbackRate: 0.995,
      gainScale: 0.98,
      filterType: 'lowshelf',
      filterFrequency: 220,
      filterQ: 0.7,
      filterGainDb: 3.5,
      holdSeconds: 3.5,
      releaseSeconds: 2.5,
    },
  },
  {
    id: 'electric',
    icon: '⚡',
    labelKey: 'guitar.voices.electric',
    // Solid-body night stage: indigo / neon purple.
    theme: {
      accent: '#7B6CFF',
      stageBg: '#0A0C18',
      stageOverlay: '#181E38',
      fretboard: {
        nut: '#161A2C',
        marker: '#121628',
        cellBorder: '#2A3050',
        nutEdge: '#C0B8FF',
        stringIdle: '#8A90B0',
        board: '#0E1220',
      },
    },
    audio: {
      // Real guitar-electric samples; mild amp mid presence (no WaveShaper — mutes graph).
      playbackRate: 1,
      gainScale: 1.08,
      filterType: 'peaking',
      filterFrequency: 2400,
      filterQ: 0.85,
      filterGainDb: 3.5,
      holdSeconds: 2.4,
      releaseSeconds: 1.4,
    },
  },
];

export function getGuitarVoice(id: GuitarVoiceId): GuitarVoiceDefinition {
  return GUITAR_VOICES.find((voice) => voice.id === id) ?? GUITAR_VOICES[0];
}
