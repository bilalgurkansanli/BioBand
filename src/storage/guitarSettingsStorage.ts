import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'guitar.settings.v1';

export type GuitarUiSettings = {
  /** Show fret numbers along the nut header. */
  showFretNumbers: boolean;
  /** Flash guide cells stronger during tutorial. */
  strongGuideHighlight: boolean;
};

export const DEFAULT_GUITAR_UI_SETTINGS: GuitarUiSettings = {
  showFretNumbers: true,
  strongGuideHighlight: true,
};

export async function loadGuitarUiSettings(): Promise<GuitarUiSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_GUITAR_UI_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<GuitarUiSettings>;
    return {
      showFretNumbers:
        typeof parsed.showFretNumbers === 'boolean'
          ? parsed.showFretNumbers
          : DEFAULT_GUITAR_UI_SETTINGS.showFretNumbers,
      strongGuideHighlight:
        typeof parsed.strongGuideHighlight === 'boolean'
          ? parsed.strongGuideHighlight
          : DEFAULT_GUITAR_UI_SETTINGS.strongGuideHighlight,
    };
  } catch {
    return { ...DEFAULT_GUITAR_UI_SETTINGS };
  }
}

export async function saveGuitarUiSettings(settings: GuitarUiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore persistence failures — UI still works in-session.
  }
}
