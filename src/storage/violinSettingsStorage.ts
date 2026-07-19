import AsyncStorage from '@react-native-async-storage/async-storage';

import { VIOLIN_VOICES, type ViolinVoiceId } from '../instruments/violin/violinVoices';
import type { PianoFxSettings } from '../instruments/piano/pianoFx';
import {
  createDefaultPianoFxSettings,
  parseStoredPianoFxSettings,
} from './fxSettingsPersistence';

const STORAGE_KEY = 'violin.settings.v1';

const VALID_VOICE_IDS = new Set<string>(VIOLIN_VOICES.map((voice) => voice.id));

/** Per-cell labels: note names (D4), violin finger numbers (0-4), or none. */
export type ViolinNoteLabelMode = 'off' | 'note' | 'finger';

const NOTE_LABEL_MODES = new Set<string>(['off', 'note', 'finger']);

export type ViolinUiSettings = {
  noteLabelMode: ViolinNoteLabelMode;
  strongGuideHighlight: boolean;
  /** Short device vibration on touch. */
  haptics: boolean;
  voiceId: ViolinVoiceId;
  fx: PianoFxSettings;
};

export const DEFAULT_VIOLIN_UI_SETTINGS: ViolinUiSettings = {
  noteLabelMode: 'note',
  strongGuideHighlight: true,
  haptics: true,
  voiceId: 'classic',
  fx: createDefaultPianoFxSettings(),
};

function parseVoiceId(value: unknown): ViolinVoiceId {
  if (typeof value === 'string' && VALID_VOICE_IDS.has(value)) {
    return value as ViolinVoiceId;
  }
  return DEFAULT_VIOLIN_UI_SETTINGS.voiceId;
}

function parseNoteLabelMode(value: unknown): ViolinNoteLabelMode {
  if (typeof value === 'string' && NOTE_LABEL_MODES.has(value)) {
    return value as ViolinNoteLabelMode;
  }
  return DEFAULT_VIOLIN_UI_SETTINGS.noteLabelMode;
}

export async function loadViolinUiSettings(): Promise<ViolinUiSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_VIOLIN_UI_SETTINGS,
        fx: createDefaultPianoFxSettings(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<ViolinUiSettings>;
    return {
      noteLabelMode: parseNoteLabelMode(parsed.noteLabelMode),
      strongGuideHighlight:
        typeof parsed.strongGuideHighlight === 'boolean'
          ? parsed.strongGuideHighlight
          : DEFAULT_VIOLIN_UI_SETTINGS.strongGuideHighlight,
      haptics:
        typeof parsed.haptics === 'boolean'
          ? parsed.haptics
          : DEFAULT_VIOLIN_UI_SETTINGS.haptics,
      voiceId: parseVoiceId(parsed.voiceId),
      fx: parseStoredPianoFxSettings(parsed.fx),
    };
  } catch {
    return {
      ...DEFAULT_VIOLIN_UI_SETTINGS,
      fx: createDefaultPianoFxSettings(),
    };
  }
}

export async function saveViolinUiSettings(settings: ViolinUiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore persistence failures — UI still works in-session.
  }
}
