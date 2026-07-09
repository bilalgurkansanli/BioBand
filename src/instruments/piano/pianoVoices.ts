// Piano voice catalog: each voice pairs a sound character with a visual
// theme. Sample-based voices reuse the Salamander recordings (processed or
// repitched); the rest are synthesized live with oscillators, so no extra
// sample assets are needed.

export type PianoVoiceId =
  | 'acoustic'
  | 'bright'
  | 'musicBox'
  | 'organ'
  | 'rhodes'
  | 'synth';

export type PianoKeyColors = {
  white: string;
  whiteActive: string;
  whiteBottomBorder: string;
  black: string;
  blackActive: string;
  /** Solfege label color on white keys. */
  whiteText: string;
  /** Solfege label color on black keys. */
  blackText: string;
  /** Letter badge background on black keys. */
  blackBadge: string;
};

export type PianoVoiceTheme = {
  /** Accent used for the toolbar icon and selection highlight. */
  accent: string;
  /** Backdrop behind the keys. */
  background: string;
  /** Label badge on lower-octave white keys. */
  badgeLow: string;
  /** Label badge on upper-octave white keys. */
  badgeHigh: string;
  keys: PianoKeyColors;
};

export type PianoVoiceDefinition = {
  id: PianoVoiceId;
  /** Emoji shown in the voice picker. */
  icon: string;
  labelKey: string;
  theme: PianoVoiceTheme;
};

export const PIANO_VOICES: PianoVoiceDefinition[] = [
  {
    id: 'acoustic',
    icon: '🎹',
    labelKey: 'piano.voices.acoustic',
    // Classic concert grand: ivory whites, ebony blacks.
    theme: {
      accent: '#8BC34A',
      background: '#0A0A0A',
      badgeLow: '#8BC34A',
      badgeHigh: '#64B5F6',
      keys: {
        white: '#F4F4F4',
        whiteActive: '#B0B0B0',
        whiteBottomBorder: '#B8B8B8',
        black: '#141414',
        blackActive: '#3A3A3A',
        whiteText: '#333333',
        blackText: '#F0F0F0',
        blackBadge: '#3A3A3A',
      },
    },
  },
  {
    id: 'bright',
    icon: '✨',
    labelKey: 'piano.voices.bright',
    // Sunny stage piano: warm ivory keys with golden shading.
    theme: {
      accent: '#FFD54F',
      background: '#171204',
      badgeLow: '#FFB300',
      badgeHigh: '#FFD54F',
      keys: {
        white: '#FFF8E1',
        whiteActive: '#FFD54F',
        whiteBottomBorder: '#C9A227',
        black: '#4E342E',
        blackActive: '#795548',
        whiteText: '#795548',
        blackText: '#FFF8E1',
        blackBadge: '#6D4C41',
      },
    },
  },
  {
    id: 'musicBox',
    icon: '🎠',
    labelKey: 'piano.voices.musicBox',
    // Toy carousel: pink "white" keys, white "black" keys.
    theme: {
      accent: '#F48FB1',
      background: '#2B0E1C',
      badgeLow: '#EC407A',
      badgeHigh: '#AD1457',
      keys: {
        white: '#F8BBD0',
        whiteActive: '#F06292',
        whiteBottomBorder: '#EC407A',
        black: '#FFFFFF',
        blackActive: '#F8BBD0',
        whiteText: '#880E4F',
        blackText: '#AD1457',
        blackBadge: '#EC407A',
      },
    },
  },
  {
    id: 'organ',
    icon: '⛪',
    labelKey: 'piano.voices.organ',
    // Cathedral organ console: cream keys on dark wood.
    theme: {
      accent: '#FF8A65',
      background: '#1D0F06',
      badgeLow: '#E64A19',
      badgeHigh: '#FF8A65',
      keys: {
        white: '#FFF3E0',
        whiteActive: '#FFCC80',
        whiteBottomBorder: '#B98A5E',
        black: '#4E342E',
        blackActive: '#795548',
        whiteText: '#6D4C41',
        blackText: '#FFF3E0',
        blackBadge: '#8D6E63',
      },
    },
  },
  {
    id: 'rhodes',
    icon: '⚡',
    labelKey: 'piano.voices.rhodes',
    // Vintage electric piano: lavender keys, deep purple sharps.
    theme: {
      accent: '#B39DDB',
      background: '#140B24',
      badgeLow: '#7E57C2',
      badgeHigh: '#B39DDB',
      keys: {
        white: '#EDE7F6',
        whiteActive: '#B39DDB',
        whiteBottomBorder: '#9575CD',
        black: '#311B92',
        blackActive: '#5E35B1',
        whiteText: '#4527A0',
        blackText: '#EDE7F6',
        blackBadge: '#5E35B1',
      },
    },
  },
  {
    id: 'synth',
    icon: '🎛️',
    labelKey: 'piano.voices.synth',
    // Neon synthesizer: dark slate keys with cyan glow.
    theme: {
      accent: '#4DD0E1',
      background: '#02171C',
      badgeLow: '#00ACC1',
      badgeHigh: '#4DD0E1',
      keys: {
        white: '#37474F',
        whiteActive: '#00838F',
        whiteBottomBorder: '#4DD0E1',
        black: '#0D1F24',
        blackActive: '#00ACC1',
        whiteText: '#4DD0E1',
        blackText: '#4DD0E1',
        blackBadge: '#00363D',
      },
    },
  },
];

export function getPianoVoice(id: PianoVoiceId): PianoVoiceDefinition {
  return PIANO_VOICES.find((voice) => voice.id === id) ?? PIANO_VOICES[0];
}
