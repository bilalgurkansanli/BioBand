import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@bioband/recording-settings.v1';

export type RecordingUiSettings = {
  /**
   * Play four clicks before the take starts, so the first note lands on a beat
   * instead of wherever the finger happened to be.
   */
  countInEnabled: boolean;
};

export const DEFAULT_RECORDING_UI_SETTINGS: RecordingUiSettings = {
  // On by default: an unusable first bar is a worse first impression than a
  // two-second wait, and the toggle is one tap away for anyone capturing ideas.
  countInEnabled: true,
};

export async function loadRecordingSettings(): Promise<RecordingUiSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_RECORDING_UI_SETTINGS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_RECORDING_UI_SETTINGS;
    }
    const value = (parsed as Partial<RecordingUiSettings>).countInEnabled;
    return {
      countInEnabled:
        typeof value === 'boolean' ? value : DEFAULT_RECORDING_UI_SETTINGS.countInEnabled,
    };
  } catch {
    return DEFAULT_RECORDING_UI_SETTINGS;
  }
}

export async function saveRecordingSettings(settings: RecordingUiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('[recordingSettings] could not persist', error);
  }
}
