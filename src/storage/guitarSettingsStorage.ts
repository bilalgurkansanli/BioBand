import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GUITAR_CHORD_PLAY_MODES,
  isGuitarChordPlayMode,
  normalizeVisiblePlayModes,
  type GuitarChordPlayMode,
} from '../instruments/guitar/guitarChordPatterns';
import {
  ALL_GUITAR_CHORD_IDS,
  normalizeVisibleChordIds,
  type ChordId,
} from '../instruments/guitar/guitarChords';
import {
  isGuitarStrumTightnessId,
  isGuitarSustainLengthId,
  normalizeGuitarFretRange,
  type GuitarFretRange,
  type GuitarStrumTightnessId,
  type GuitarSustainLengthId,
} from '../instruments/guitar/guitarFeel';
import {
  isGuitarVelocityCurveId,
  type GuitarVelocityCurveId,
} from '../instruments/guitar/guitarVelocity';
import { GUITAR_VOICES, type GuitarVoiceId } from '../instruments/guitar/guitarVoices';
import type { PianoFxSettings } from '../instruments/piano/pianoFx';
import {
  createDefaultPianoFxSettings,
  parseStoredPianoFxSettings,
} from './fxSettingsPersistence';

const STORAGE_KEY = 'guitar.settings.v1';

const VALID_VOICE_IDS = new Set<string>(GUITAR_VOICES.map((voice) => voice.id));

export type GuitarUiSettings = {
  /** Show fret numbers along the nut header. */
  showFretNumbers: boolean;
  /** Flash guide cells stronger during tutorial. */
  strongGuideHighlight: boolean;
  /** Vibrate on every pluck / strum. */
  haptics: boolean;
  /** Bend/vibrato drag gesture on held notes. */
  bendEnabled: boolean;
  /** String vibration wobble visuals (off = zero per-pluck UI work). */
  stringAnimation: boolean;
  /** Touch-response curve for pluck velocity. */
  velocityCurve: GuitarVelocityCurveId;
  /** Strum cascade feel (stagger scale). */
  strumTightness: GuitarStrumTightnessId;
  /** One-shot sustain tail length. */
  sustainLength: GuitarSustainLengthId;
  /** Highest fret shown on the board (0..N). */
  maxFret: GuitarFretRange;
  /** Show Strum / Arpeggio / Rasgueado bar above chords. */
  showChordPlayModeBar: boolean;
  /** Which play modes appear on the bar (catalog order). */
  visiblePlayModes: GuitarChordPlayMode[];
  /** Which chords appear in the ChordBar (catalog order). */
  visibleChordIds: ChordId[];
  /** Last selected guitar voice. */
  voiceId: GuitarVoiceId;
  /** Last FX mix used on the guitar screen. */
  fx: PianoFxSettings;
  /** Strum / arpeggio / rasgueado when playing chords. */
  chordPlayMode: GuitarChordPlayMode;
};

export const DEFAULT_GUITAR_UI_SETTINGS: GuitarUiSettings = {
  showFretNumbers: true,
  strongGuideHighlight: true,
  haptics: false,
  bendEnabled: true,
  stringAnimation: true,
  velocityCurve: 'normal',
  strumTightness: 'normal',
  sustainLength: 'normal',
  maxFret: 12,
  showChordPlayModeBar: true,
  visiblePlayModes: [...GUITAR_CHORD_PLAY_MODES],
  visibleChordIds: [...ALL_GUITAR_CHORD_IDS],
  voiceId: 'nylon',
  fx: createDefaultPianoFxSettings(),
  chordPlayMode: 'strum',
};

function parseVoiceId(value: unknown): GuitarVoiceId {
  if (typeof value === 'string' && VALID_VOICE_IDS.has(value)) {
    return value as GuitarVoiceId;
  }
  return DEFAULT_GUITAR_UI_SETTINGS.voiceId;
}

function parseChordPlayMode(value: unknown): GuitarChordPlayMode {
  if (typeof value === 'string' && isGuitarChordPlayMode(value)) {
    return value;
  }
  return DEFAULT_GUITAR_UI_SETTINGS.chordPlayMode;
}

function parseVisibleChordIds(value: unknown): ChordId[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_GUITAR_UI_SETTINGS.visibleChordIds];
  }
  return normalizeVisibleChordIds(value.filter((id): id is string => typeof id === 'string'));
}

function parseVisiblePlayModes(value: unknown): GuitarChordPlayMode[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_GUITAR_UI_SETTINGS.visiblePlayModes];
  }
  return normalizeVisiblePlayModes(
    value.filter((id): id is string => typeof id === 'string'),
  );
}

export async function loadGuitarUiSettings(): Promise<GuitarUiSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_GUITAR_UI_SETTINGS,
        visiblePlayModes: [...GUITAR_CHORD_PLAY_MODES],
        visibleChordIds: [...ALL_GUITAR_CHORD_IDS],
        fx: createDefaultPianoFxSettings(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<GuitarUiSettings>;
    const visiblePlayModes = parseVisiblePlayModes(parsed.visiblePlayModes);
    let chordPlayMode = parseChordPlayMode(parsed.chordPlayMode);
    if (!visiblePlayModes.includes(chordPlayMode)) {
      chordPlayMode = visiblePlayModes[0] ?? DEFAULT_GUITAR_UI_SETTINGS.chordPlayMode;
    }
    return {
      showFretNumbers:
        typeof parsed.showFretNumbers === 'boolean'
          ? parsed.showFretNumbers
          : DEFAULT_GUITAR_UI_SETTINGS.showFretNumbers,
      strongGuideHighlight:
        typeof parsed.strongGuideHighlight === 'boolean'
          ? parsed.strongGuideHighlight
          : DEFAULT_GUITAR_UI_SETTINGS.strongGuideHighlight,
      haptics:
        typeof parsed.haptics === 'boolean'
          ? parsed.haptics
          : DEFAULT_GUITAR_UI_SETTINGS.haptics,
      bendEnabled:
        typeof parsed.bendEnabled === 'boolean'
          ? parsed.bendEnabled
          : DEFAULT_GUITAR_UI_SETTINGS.bendEnabled,
      stringAnimation:
        typeof parsed.stringAnimation === 'boolean'
          ? parsed.stringAnimation
          : DEFAULT_GUITAR_UI_SETTINGS.stringAnimation,
      velocityCurve: isGuitarVelocityCurveId(parsed.velocityCurve)
        ? parsed.velocityCurve
        : DEFAULT_GUITAR_UI_SETTINGS.velocityCurve,
      strumTightness: isGuitarStrumTightnessId(parsed.strumTightness)
        ? parsed.strumTightness
        : DEFAULT_GUITAR_UI_SETTINGS.strumTightness,
      sustainLength: isGuitarSustainLengthId(parsed.sustainLength)
        ? parsed.sustainLength
        : DEFAULT_GUITAR_UI_SETTINGS.sustainLength,
      maxFret: normalizeGuitarFretRange(parsed.maxFret),
      showChordPlayModeBar:
        typeof parsed.showChordPlayModeBar === 'boolean'
          ? parsed.showChordPlayModeBar
          : DEFAULT_GUITAR_UI_SETTINGS.showChordPlayModeBar,
      visiblePlayModes,
      visibleChordIds: parseVisibleChordIds(parsed.visibleChordIds),
      voiceId: parseVoiceId(parsed.voiceId),
      fx: parseStoredPianoFxSettings(parsed.fx),
      chordPlayMode,
    };
  } catch {
    return {
      ...DEFAULT_GUITAR_UI_SETTINGS,
      visiblePlayModes: [...GUITAR_CHORD_PLAY_MODES],
      visibleChordIds: [...ALL_GUITAR_CHORD_IDS],
      fx: createDefaultPianoFxSettings(),
    };
  }
}

export async function saveGuitarUiSettings(settings: GuitarUiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore persistence failures — UI still works in-session.
  }
}
