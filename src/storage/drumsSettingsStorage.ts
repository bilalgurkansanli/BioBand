import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'drums.settings.v1';

export type DrumsUiSettings = {
  /** Show pad names under pieces (accessibility / learning). */
  showPadLabels: boolean;
  /** Flash guide ring stronger during tutorial. */
  strongGuideHighlight: boolean;
};

export const DEFAULT_DRUMS_UI_SETTINGS: DrumsUiSettings = {
  showPadLabels: false,
  strongGuideHighlight: true,
};

export async function loadDrumsUiSettings(): Promise<DrumsUiSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_DRUMS_UI_SETTINGS };
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
    };
  } catch {
    return { ...DEFAULT_DRUMS_UI_SETTINGS };
  }
}

export async function saveDrumsUiSettings(settings: DrumsUiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore persistence failures — UI still works in-session.
  }
}
