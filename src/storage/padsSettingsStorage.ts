import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NoteRepeatRate } from '../hooks/usePadNoteRepeat';
import { PAD_BANKS, type PadBankId } from '../instruments/pads/padsBanks';
import type { PianoFxSettings } from '../instruments/piano/pianoFx';
import {
  createDefaultPianoFxSettings,
  parseStoredPianoFxSettings,
} from './fxSettingsPersistence';

const STORAGE_KEY = 'pads.settings.v1';

const VALID_BANK_IDS = new Set<string>(PAD_BANKS.map((bank) => bank.id));
const VALID_NOTE_REPEAT_RATES = new Set<NoteRepeatRate>(['eighth', 'sixteenth']);

export type PadsUiSettings = {
  showPadLabels: boolean;
  strongGuideHighlight: boolean;
  showSpeedHud: boolean;
  noteRepeatEnabled: boolean;
  noteRepeatRate: NoteRepeatRate;
  bankId: PadBankId;
  fx: PianoFxSettings;
};

export const DEFAULT_PADS_UI_SETTINGS: PadsUiSettings = {
  showPadLabels: true,
  strongGuideHighlight: true,
  showSpeedHud: false,
  noteRepeatEnabled: false,
  noteRepeatRate: 'sixteenth',
  bankId: 'drums',
  fx: createDefaultPianoFxSettings(),
};

function parseNoteRepeatRate(value: unknown): NoteRepeatRate {
  if (typeof value === 'string' && VALID_NOTE_REPEAT_RATES.has(value as NoteRepeatRate)) {
    return value as NoteRepeatRate;
  }
  return DEFAULT_PADS_UI_SETTINGS.noteRepeatRate;
}

function parseBankId(value: unknown): PadBankId {
  if (typeof value === 'string' && VALID_BANK_IDS.has(value)) {
    return value as PadBankId;
  }
  // Migrate legacy filter-kit ids → drums bank.
  if (typeof value === 'string') {
    return 'drums';
  }
  return DEFAULT_PADS_UI_SETTINGS.bankId;
}

export async function loadPadsUiSettings(): Promise<PadsUiSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_PADS_UI_SETTINGS,
        fx: createDefaultPianoFxSettings(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<PadsUiSettings> & { kitId?: unknown };
    return {
      showPadLabels:
        typeof parsed.showPadLabels === 'boolean'
          ? parsed.showPadLabels
          : DEFAULT_PADS_UI_SETTINGS.showPadLabels,
      strongGuideHighlight:
        typeof parsed.strongGuideHighlight === 'boolean'
          ? parsed.strongGuideHighlight
          : DEFAULT_PADS_UI_SETTINGS.strongGuideHighlight,
      showSpeedHud:
        typeof parsed.showSpeedHud === 'boolean'
          ? parsed.showSpeedHud
          : DEFAULT_PADS_UI_SETTINGS.showSpeedHud,
      noteRepeatEnabled:
        typeof parsed.noteRepeatEnabled === 'boolean'
          ? parsed.noteRepeatEnabled
          : DEFAULT_PADS_UI_SETTINGS.noteRepeatEnabled,
      noteRepeatRate: parseNoteRepeatRate(parsed.noteRepeatRate),
      bankId: parseBankId(parsed.bankId ?? parsed.kitId),
      fx: parseStoredPianoFxSettings(parsed.fx),
    };
  } catch {
    return {
      ...DEFAULT_PADS_UI_SETTINGS,
      fx: createDefaultPianoFxSettings(),
    };
  }
}

export async function savePadsUiSettings(settings: PadsUiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore persistence failures — UI still works in-session.
  }
}
