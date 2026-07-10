import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  PIANO_SCALE_OPTIONS,
  type PianoScaleId,
} from '../instruments/piano/pianoScales';

const STORAGE_KEY = 'piano.settings.v1';

const VALID_SCALE_IDS = new Set<string>(
  PIANO_SCALE_OPTIONS.map((option) => option.id),
);

export type PianoUiSettings = {
  showTonePanel: boolean;
  showSpeedHud: boolean;
  /** null = scale lights off */
  scaleId: PianoScaleId | null;
};

export const DEFAULT_PIANO_UI_SETTINGS: PianoUiSettings = {
  showTonePanel: true,
  showSpeedHud: true,
  scaleId: null,
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

export async function loadPianoUiSettings(): Promise<PianoUiSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PIANO_UI_SETTINGS };
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
    };
  } catch {
    return { ...DEFAULT_PIANO_UI_SETTINGS };
  }
}

export async function savePianoUiSettings(settings: PianoUiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore persistence failures — UI still works in-session.
  }
}
