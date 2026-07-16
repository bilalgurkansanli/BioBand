import AsyncStorage from '@react-native-async-storage/async-storage';

import { DRUM_KITS, type DrumKitId } from '../instruments/drums/drumsKits';
import type { PianoFxSettings } from '../instruments/piano/pianoFx';
import {
  createDefaultPianoFxSettings,
  parseStoredPianoFxSettings,
} from './fxSettingsPersistence';

const STORAGE_KEY = 'drums.settings.v1';

const VALID_KIT_IDS = new Set<string>(DRUM_KITS.map((kit) => kit.id));

export type DrumsUiSettings = {
  /** Show pad names under pieces (accessibility / learning). */
  showPadLabels: boolean;
  /** Flash guide ring stronger during tutorial. */
  strongGuideHighlight: boolean;
  /** Last selected drum kit. */
  kitId: DrumKitId;
  /** Last FX mix used on the drums screen. */
  fx: PianoFxSettings;
};

export const DEFAULT_DRUMS_UI_SETTINGS: DrumsUiSettings = {
  showPadLabels: false,
  strongGuideHighlight: true,
  kitId: 'acoustic',
  fx: createDefaultPianoFxSettings(),
};

function parseKitId(value: unknown): DrumKitId {
  if (typeof value === 'string' && VALID_KIT_IDS.has(value)) {
    return value as DrumKitId;
  }
  return DEFAULT_DRUMS_UI_SETTINGS.kitId;
}

export async function loadDrumsUiSettings(): Promise<DrumsUiSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_DRUMS_UI_SETTINGS,
        fx: createDefaultPianoFxSettings(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<DrumsUiSettings>;
    return {
      showPadLabels:
        typeof parsed.showPadLabels === 'boolean'
          ? parsed.showPadLabels
          : DEFAULT_DRUMS_UI_SETTINGS.showPadLabels,
      strongGuideHighlight:
        typeof parsed.strongGuideHighlight === 'boolean'
          ? parsed.strongGuideHighlight
          : DEFAULT_DRUMS_UI_SETTINGS.strongGuideHighlight,
      kitId: parseKitId(parsed.kitId),
      fx: parseStoredPianoFxSettings(parsed.fx),
    };
  } catch {
    return {
      ...DEFAULT_DRUMS_UI_SETTINGS,
      fx: createDefaultPianoFxSettings(),
    };
  }
}

export async function saveDrumsUiSettings(settings: DrumsUiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore persistence failures — UI still works in-session.
  }
}
