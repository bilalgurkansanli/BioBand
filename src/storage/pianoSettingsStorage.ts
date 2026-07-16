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
};

export const DEFAULT_PIANO_UI_SETTINGS: PianoUiSettings = {
  showTonePanel: true,
  showSpeedHud: true,
  scaleId: null,
  voiceId: 'acoustic',
  fx: createDefaultPianoFxSettings(),
};

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
