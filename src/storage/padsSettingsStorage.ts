import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NoteRepeatRate } from '../hooks/usePadNoteRepeat';
import { isPadBankId, type PadBankId } from '../instruments/pads/padsBanks';
import type { PianoFxSettings } from '../instruments/piano/pianoFx';
import {
  createDefaultPianoFxSettings,
  parseStoredPianoFxSettings,
} from './fxSettingsPersistence';

const STORAGE_KEY = 'pads.settings.v1';

const VALID_NOTE_REPEAT_RATES = new Set<NoteRepeatRate>(['eighth', 'sixteenth']);

export type PadLabelMode = 'name' | 'note' | 'off';
export type PadVelocityMode = 'fixed' | 'position';
export type PadVelocityCurve = 'soft' | 'normal' | 'hard';
export type PadQuantizeMode = 'off' | 'half' | 'full';

export const PAD_LABEL_MODES: PadLabelMode[] = ['name', 'note', 'off'];
export const PAD_VELOCITY_CURVES: PadVelocityCurve[] = ['soft', 'normal', 'hard'];
export const PAD_QUANTIZE_MODES: PadQuantizeMode[] = ['off', 'half', 'full'];

export type PadsUiSettings = {
  labelMode: PadLabelMode;
  strongGuideHighlight: boolean;
  showSpeedHud: boolean;
  noteRepeatEnabled: boolean;
  noteRepeatRate: NoteRepeatRate;
  bankId: PadBankId;
  fx: PianoFxSettings;
  velocityMode: PadVelocityMode;
  velocityCurve: PadVelocityCurve;
  haptics: boolean;
  padTrail: boolean;
  stageLight: boolean;
  quantize: PadQuantizeMode;
  xySurface: boolean;
};

export const DEFAULT_PADS_UI_SETTINGS: PadsUiSettings = {
  labelMode: 'name',
  strongGuideHighlight: true,
  showSpeedHud: false,
  noteRepeatEnabled: false,
  noteRepeatRate: 'sixteenth',
  bankId: 'drums',
  fx: createDefaultPianoFxSettings(),
  velocityMode: 'position',
  velocityCurve: 'normal',
  haptics: true,
  padTrail: false,
  stageLight: true,
  quantize: 'full',
  xySurface: false,
};

function parseNoteRepeatRate(value: unknown): NoteRepeatRate {
  if (typeof value === 'string' && VALID_NOTE_REPEAT_RATES.has(value as NoteRepeatRate)) {
    return value as NoteRepeatRate;
  }
  return DEFAULT_PADS_UI_SETTINGS.noteRepeatRate;
}

function parseBankId(value: unknown): PadBankId {
  if (isPadBankId(value)) {
    return value;
  }
  // Migrate legacy filter-kit ids → drums bank.
  if (typeof value === 'string') {
    return 'drums';
  }
  return DEFAULT_PADS_UI_SETTINGS.bankId;
}

function parseEnum<T extends string>(value: unknown, valid: T[], fallback: T): T {
  return typeof value === 'string' && (valid as string[]).includes(value)
    ? (value as T)
    : fallback;
}

function parseBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseLabelMode(value: unknown, legacyShowPadLabels: unknown): PadLabelMode {
  if (typeof value === 'string' && (PAD_LABEL_MODES as string[]).includes(value)) {
    return value as PadLabelMode;
  }
  // Migrate the pre-labelMode boolean.
  if (typeof legacyShowPadLabels === 'boolean') {
    return legacyShowPadLabels ? 'name' : 'off';
  }
  return DEFAULT_PADS_UI_SETTINGS.labelMode;
}

export async function loadPadsUiSettings(): Promise<PadsUiSettings> {
  const defaults: PadsUiSettings = {
    ...DEFAULT_PADS_UI_SETTINGS,
    fx: createDefaultPianoFxSettings(),
  };
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<PadsUiSettings> & {
      kitId?: unknown;
      showPadLabels?: unknown;
    };
    return {
      labelMode: parseLabelMode(parsed.labelMode, parsed.showPadLabels),
      strongGuideHighlight: parseBool(
        parsed.strongGuideHighlight,
        defaults.strongGuideHighlight,
      ),
      showSpeedHud: parseBool(parsed.showSpeedHud, defaults.showSpeedHud),
      noteRepeatEnabled: parseBool(parsed.noteRepeatEnabled, defaults.noteRepeatEnabled),
      noteRepeatRate: parseNoteRepeatRate(parsed.noteRepeatRate),
      bankId: parseBankId(parsed.bankId ?? parsed.kitId),
      fx: parseStoredPianoFxSettings(parsed.fx),
      velocityMode: parseEnum(
        parsed.velocityMode,
        ['fixed', 'position'],
        defaults.velocityMode,
      ),
      velocityCurve: parseEnum(
        parsed.velocityCurve,
        PAD_VELOCITY_CURVES,
        defaults.velocityCurve,
      ),
      haptics: parseBool(parsed.haptics, defaults.haptics),
      padTrail: parseBool(parsed.padTrail, defaults.padTrail),
      stageLight: parseBool(parsed.stageLight, defaults.stageLight),
      quantize: parseEnum(parsed.quantize, PAD_QUANTIZE_MODES, defaults.quantize),
      xySurface: parseBool(parsed.xySurface, defaults.xySurface),
    };
  } catch {
    return defaults;
  }
}

export async function savePadsUiSettings(settings: PadsUiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore persistence failures — UI still works in-session.
  }
}
