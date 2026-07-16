import { isPhraseId, type PhraseId } from './violinPhrases';

export type ViolinStringId = 'v1' | 'v2' | 'v3' | 'v4';

/** Positions 0..POSITION_COUNT-1 (open through +9 semitones). */
export const POSITION_COUNT = 10;

export const VIOLIN_STRINGS: {
  id: ViolinStringId;
  openMidi: number;
  labelKey: string;
}[] = [
  { id: 'v1', openMidi: 76, labelKey: 'violin.strings.e' },
  { id: 'v2', openMidi: 69, labelKey: 'violin.strings.a' },
  { id: 'v3', openMidi: 62, labelKey: 'violin.strings.d' },
  { id: 'v4', openMidi: 55, labelKey: 'violin.strings.g' },
];

const STRING_IDS = new Set<string>(VIOLIN_STRINGS.map((s) => s.id));

/** Recording / play-along id: `v3:5` */
export function formatNoteSoundId(stringId: ViolinStringId, position: number): string {
  const clamped = Math.max(0, Math.min(POSITION_COUNT - 1, Math.round(position)));
  return `${stringId}:${clamped}`;
}

export function formatPhraseSoundId(phraseId: PhraseId): string {
  return `phrase:${phraseId}`;
}

export type ParsedViolinSound =
  | { kind: 'note'; stringId: ViolinStringId; position: number }
  | { kind: 'phrase'; phraseId: PhraseId };

export function parseViolinSoundId(soundId: string): ParsedViolinSound | null {
  if (soundId.startsWith('phrase:')) {
    const phraseId = soundId.slice('phrase:'.length);
    if (!isPhraseId(phraseId)) {
      return null;
    }
    return { kind: 'phrase', phraseId };
  }

  const match = soundId.match(/^(v[1-4]):(\d{1,2})$/);
  if (!match) {
    return null;
  }

  const stringId = match[1] as ViolinStringId;
  const position = Number(match[2]);
  if (!STRING_IDS.has(stringId) || !Number.isFinite(position)) {
    return null;
  }

  return {
    kind: 'note',
    stringId,
    position: Math.max(0, Math.min(POSITION_COUNT - 1, position)),
  };
}
