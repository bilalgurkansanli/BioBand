// Optional key skins. The default ('voice') follows the selected instrument
// voice's own palette; the others are fixed overrides that stay constant no
// matter which voice is playing — handy when a voice's "white" keys are dark
// (e.g. the synth) and hard to read, or purely for personal taste.

import type { PianoKeyThemeId } from '../../storage/pianoSettingsStorage';
import type { PianoVoiceTheme } from './pianoVoices';

const KEY_SKINS: Record<Exclude<PianoKeyThemeId, 'voice'>, PianoVoiceTheme> = {
  // Timeless concert grand: ivory whites, ebony blacks.
  ivory: {
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
  // Maximum readability: pure white keys, pure black sharps, bold labels.
  contrast: {
    accent: '#FFFFFF',
    background: '#000000',
    badgeLow: '#111111',
    badgeHigh: '#111111',
    keys: {
      white: '#FFFFFF',
      whiteActive: '#FFD54F',
      whiteBottomBorder: '#000000',
      black: '#000000',
      blackActive: '#4A4A4A',
      whiteText: '#000000',
      blackText: '#FFFFFF',
      blackBadge: '#000000',
    },
  },
  // Warm dusk palette: peach whites, plum sharps.
  sunset: {
    accent: '#FF7043',
    background: '#1A0E14',
    badgeLow: '#FF7043',
    badgeHigh: '#FFB300',
    keys: {
      white: '#FFE7C7',
      whiteActive: '#FFC078',
      whiteBottomBorder: '#D99A5B',
      black: '#3E2723',
      blackActive: '#5D4037',
      whiteText: '#7A3B00',
      blackText: '#FFE7C7',
      blackBadge: '#5D4037',
    },
  },
};

/** The picker order shown in settings (excludes the 'voice' default entry). */
export const PIANO_KEY_THEME_IDS: PianoKeyThemeId[] = [
  'voice',
  'ivory',
  'contrast',
  'sunset',
];

/** Resolve the keyboard palette from the voice palette + the chosen skin. */
export function resolveKeyboardTheme(
  voiceTheme: PianoVoiceTheme,
  themeId: PianoKeyThemeId,
): PianoVoiceTheme {
  if (themeId === 'voice') {
    return voiceTheme;
  }
  return KEY_SKINS[themeId] ?? voiceTheme;
}
