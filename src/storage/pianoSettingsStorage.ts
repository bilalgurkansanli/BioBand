import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  PIANO_SCALE_OPTIONS,
  type PianoScaleId,
} from '../instruments/piano/pianoScales';
import { PIANO_VOICES, type PianoVoiceId } from '../instruments/piano/pianoVoices';
import type { PianoFxSettings } from '../instruments/piano/pianoFx';
import {
  createDefaultPianoFxSettings,
  parseStoredPianoFxSettings,
} from './fxSettingsPersistence';

const STORAGE_KEY = 'piano.settings.v1';

/** How the key badges are labelled. */
export type PianoLabelMode = 'both' | 'letter' | 'solfege' | 'none';
/** Optional visual skin override (default follows the instrument voice). */
export type PianoKeyThemeId = 'voice' | 'ivory' | 'contrast' | 'sunset';
/** Restrict playing to the selected scale so nothing sounds "wrong". */
export type PianoScaleLockMode = 'off' | 'mute' | 'snap';
/** One-finger chords: a single key press sounds a full chord. */
export type PianoChordMode = 'off' | 'major' | 'minor' | 'auto';

const VALID_LABEL_MODES = new Set<string>(['both', 'letter', 'solfege', 'none']);
const VALID_KEY_THEMES = new Set<string>(['voice', 'ivory', 'contrast', 'sunset']);
const VALID_SCALE_LOCKS = new Set<string>(['off', 'mute', 'snap']);
const VALID_CHORD_MODES = new Set<string>(['off', 'major', 'minor', 'auto']);

const VALID_SCALE_IDS = new Set<string>(
  PIANO_SCALE_OPTIONS.map((option) => option.id),
);
const VALID_VOICE_IDS = new Set<string>(PIANO_VOICES.map((voice) => voice.id));

export type PianoUiSettings = {
  showTonePanel: boolean;
  showSpeedHud: boolean;
  /** null = scale lights off */
  scaleId: PianoScaleId | null;
  /** Last selected piano voice. */
  voiceId: PianoVoiceId;
  /** Last FX mix used on the piano screen. */
  fx: PianoFxSettings;
  /** Master output volume, 0..1. */
  volume: number;
  /** Transpose slider position, 0..1 (0.5 = concert pitch). */
  tonePosition: number;
  /** Key badge label style. */
  labelMode: PianoLabelMode;
  /** Visual key skin ('voice' follows the selected instrument). */
  keyTheme: PianoKeyThemeId;
  /** Vibrate on key press. */
  haptics: boolean;
  /** Scale-lock behaviour for out-of-scale keys. */
  scaleLock: PianoScaleLockMode;
  /** One-finger chord assist. */
  chordMode: PianoChordMode;
};

export const DEFAULT_PIANO_UI_SETTINGS: PianoUiSettings = {
  showTonePanel: true,
  showSpeedHud: true,
  scaleId: null,
  voiceId: 'acoustic',
  fx: createDefaultPianoFxSettings(),
  volume: 1,
  tonePosition: 0.5,
  labelMode: 'both',
  keyTheme: 'voice',
  haptics: false,
  scaleLock: 'off',
  chordMode: 'off',
};

function parseFromSet<T extends string>(
  value: unknown,
  valid: Set<string>,
  fallback: T,
): T {
  return typeof value === 'string' && valid.has(value) ? (value as T) : fallback;
}

/** Parse a 0..1 float, falling back to `fallback` for invalid input. */
function parseUnitInterval(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value));
  }
  return fallback;
}

function parseScaleId(value: unknown): PianoScaleId | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string' && VALID_SCALE_IDS.has(value)) {
    return value as PianoScaleId;
  }
  return DEFAULT_PIANO_UI_SETTINGS.scaleId;
}

function parseVoiceId(value: unknown): PianoVoiceId {
  if (typeof value === 'string' && VALID_VOICE_IDS.has(value)) {
    return value as PianoVoiceId;
  }
  return DEFAULT_PIANO_UI_SETTINGS.voiceId;
}

export async function loadPianoUiSettings(): Promise<PianoUiSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_PIANO_UI_SETTINGS,
        fx: createDefaultPianoFxSettings(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<PianoUiSettings>;
    return {
      showTonePanel:
        typeof parsed.showTonePanel === 'boolean'
          ? parsed.showTonePanel
          : DEFAULT_PIANO_UI_SETTINGS.showTonePanel,
      showSpeedHud:
        typeof parsed.showSpeedHud === 'boolean'
          ? parsed.showSpeedHud
          : DEFAULT_PIANO_UI_SETTINGS.showSpeedHud,
      scaleId: parseScaleId(parsed.scaleId),
      voiceId: parseVoiceId(parsed.voiceId),
      fx: parseStoredPianoFxSettings(parsed.fx),
      volume: parseUnitInterval(parsed.volume, DEFAULT_PIANO_UI_SETTINGS.volume),
      tonePosition: parseUnitInterval(
        parsed.tonePosition,
        DEFAULT_PIANO_UI_SETTINGS.tonePosition,
      ),
      labelMode: parseFromSet(
        parsed.labelMode,
        VALID_LABEL_MODES,
        DEFAULT_PIANO_UI_SETTINGS.labelMode,
      ),
      keyTheme: parseFromSet(
        parsed.keyTheme,
        VALID_KEY_THEMES,
        DEFAULT_PIANO_UI_SETTINGS.keyTheme,
      ),
      haptics:
        typeof parsed.haptics === 'boolean'
          ? parsed.haptics
          : DEFAULT_PIANO_UI_SETTINGS.haptics,
      scaleLock: parseFromSet(
        parsed.scaleLock,
        VALID_SCALE_LOCKS,
        DEFAULT_PIANO_UI_SETTINGS.scaleLock,
      ),
      chordMode: parseFromSet(
        parsed.chordMode,
        VALID_CHORD_MODES,
        DEFAULT_PIANO_UI_SETTINGS.chordMode,
      ),
    };
  } catch {
    return {
      ...DEFAULT_PIANO_UI_SETTINGS,
      fx: createDefaultPianoFxSettings(),
    };
  }
}

export async function savePianoUiSettings(settings: PianoUiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore persistence failures — UI still works in-session.
  }
}
