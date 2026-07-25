import {
  PIANO_FX_DEFAULTS,
  PIANO_FX_RANGES,
  type PianoFxSettings,
} from '../instruments/piano/pianoFx';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Fresh default FX object (safe to mutate per instrument). */
export function createDefaultPianoFxSettings(): PianoFxSettings {
  return {
    distortion: { ...PIANO_FX_DEFAULTS.distortion },
    reverb: { ...PIANO_FX_DEFAULTS.reverb },
    echo: { ...PIANO_FX_DEFAULTS.echo },
  };
}

function parseFxSection<T extends Record<string, unknown>>(
  raw: unknown,
  defaults: T,
  numbers: Partial<Record<keyof T, { min: number; max: number }>>,
): T {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const next = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const fallback = defaults[key];
    const candidate = source[key as string];
    if (typeof fallback === 'boolean') {
      (next as Record<string, unknown>)[key as string] =
        typeof candidate === 'boolean' ? candidate : fallback;
      continue;
    }
    if (typeof fallback === 'number') {
      const range = numbers[key];
      const n = typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallback;
      (next as Record<string, unknown>)[key as string] = range
        ? clamp(n, range.min, range.max)
        : n;
    }
  }
  return next;
}

/** Validate / clamp FX JSON from AsyncStorage. */
export function parseStoredPianoFxSettings(raw: unknown): PianoFxSettings {
  const defaults = createDefaultPianoFxSettings();
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    distortion: parseFxSection(source.distortion, defaults.distortion, {
      lowPassHz: PIANO_FX_RANGES.lowPassHz,
      intensity: PIANO_FX_RANGES.intensity,
    }),
    reverb: parseFxSection(source.reverb, defaults.reverb, {
      timeSeconds: PIANO_FX_RANGES.timeSeconds,
      mix: PIANO_FX_RANGES.mix,
    }),
    echo: parseFxSection(source.echo, defaults.echo, {
      delayMs: PIANO_FX_RANGES.delayMs,
      feedback: PIANO_FX_RANGES.feedback,
      mix: PIANO_FX_RANGES.echoMix,
    }),
  };
}
