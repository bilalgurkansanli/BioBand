import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ALL_PHRASE_IDS,
  normalizeVisiblePhraseIds,
  type PhraseId,
} from '../instruments/violin/violinPhrases';
import { VIOLIN_VOICES, type ViolinVoiceId } from '../instruments/violin/violinVoices';
import type { PianoFxSettings } from '../instruments/piano/pianoFx';
import {
  createDefaultPianoFxSettings,
  parseStoredPianoFxSettings,
} from './fxSettingsPersistence';

const STORAGE_KEY = 'violin.settings.v1';

const VALID_VOICE_IDS = new Set<string>(VIOLIN_VOICES.map((voice) => voice.id));

export type ViolinUiSettings = {
  showPositionNumbers: boolean;
  strongGuideHighlight: boolean;
  visiblePhraseIds: PhraseId[];
  voiceId: ViolinVoiceId;
  fx: PianoFxSettings;
};

export const DEFAULT_VIOLIN_UI_SETTINGS: ViolinUiSettings = {
  showPositionNumbers: true,
  strongGuideHighlight: true,
  visiblePhraseIds: [...ALL_PHRASE_IDS],
  voiceId: 'classic',
  fx: createDefaultPianoFxSettings(),
};

function parseVoiceId(value: unknown): ViolinVoiceId {
  if (typeof value === 'string' && VALID_VOICE_IDS.has(value)) {
    return value as ViolinVoiceId;
  }
  return DEFAULT_VIOLIN_UI_SETTINGS.voiceId;
}

function parseVisiblePhraseIds(value: unknown): PhraseId[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_VIOLIN_UI_SETTINGS.visiblePhraseIds];
  }
  return normalizeVisiblePhraseIds(value.filter((id): id is string => typeof id === 'string'));
}

export async function loadViolinUiSettings(): Promise<ViolinUiSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_VIOLIN_UI_SETTINGS,
        visiblePhraseIds: [...ALL_PHRASE_IDS],
        fx: createDefaultPianoFxSettings(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<ViolinUiSettings>;
    return {
      showPositionNumbers:
        typeof parsed.showPositionNumbers === 'boolean'
          ? parsed.showPositionNumbers
          : DEFAULT_VIOLIN_UI_SETTINGS.showPositionNumbers,
      strongGuideHighlight:
        typeof parsed.strongGuideHighlight === 'boolean'
          ? parsed.strongGuideHighlight
          : DEFAULT_VIOLIN_UI_SETTINGS.strongGuideHighlight,
      visiblePhraseIds: parseVisiblePhraseIds(parsed.visiblePhraseIds),
      voiceId: parseVoiceId(parsed.voiceId),
      fx: parseStoredPianoFxSettings(parsed.fx),
    };
  } catch {
    return {
      ...DEFAULT_VIOLIN_UI_SETTINGS,
      visiblePhraseIds: [...ALL_PHRASE_IDS],
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
