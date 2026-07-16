import type { ViolinStringId } from './violinSounds';

export type PhraseId = 'scale' | 'twinkle' | 'arpeggio' | 'openStrings';

export type PhraseNote = {
  stringId: ViolinStringId;
  position: number;
};

export type PhraseDefinition = {
  id: PhraseId;
  labelKey: string;
  notes: PhraseNote[];
};

export const VIOLIN_PHRASES: PhraseDefinition[] = [
  {
    id: 'scale',
    labelKey: 'violin.phrases.scale',
    notes: [
      { stringId: 'v4', position: 0 },
      { stringId: 'v4', position: 1 },
      { stringId: 'v4', position: 2 },
      { stringId: 'v4', position: 3 },
      { stringId: 'v4', position: 4 },
    ],
  },
  {
    id: 'twinkle',
    labelKey: 'violin.phrases.twinkle',
    notes: [
      { stringId: 'v4', position: 5 },
      { stringId: 'v4', position: 5 },
      { stringId: 'v3', position: 0 },
      { stringId: 'v3', position: 0 },
      { stringId: 'v2', position: 0 },
      { stringId: 'v2', position: 0 },
      { stringId: 'v4', position: 5 },
    ],
  },
  {
    id: 'arpeggio',
    labelKey: 'violin.phrases.arpeggio',
    notes: [
      { stringId: 'v4', position: 0 },
      { stringId: 'v4', position: 4 },
      { stringId: 'v3', position: 0 },
      { stringId: 'v3', position: 5 },
    ],
  },
  {
    id: 'openStrings',
    labelKey: 'violin.phrases.openStrings',
    notes: [
      { stringId: 'v1', position: 0 },
      { stringId: 'v2', position: 0 },
      { stringId: 'v3', position: 0 },
      { stringId: 'v4', position: 0 },
    ],
  },
];

export const ALL_PHRASE_IDS: PhraseId[] = VIOLIN_PHRASES.map((phrase) => phrase.id);

const PHRASE_ID_SET = new Set<string>(ALL_PHRASE_IDS);

export function isPhraseId(value: string): value is PhraseId {
  return PHRASE_ID_SET.has(value);
}

export function getPhraseById(id: PhraseId): PhraseDefinition | undefined {
  return VIOLIN_PHRASES.find((phrase) => phrase.id === id);
}

/** Keep catalog order; ensure at least one phrase remains visible. */
export function normalizeVisiblePhraseIds(ids: string[]): PhraseId[] {
  const seen = new Set<PhraseId>();
  const ordered: PhraseId[] = [];
  for (const id of ALL_PHRASE_IDS) {
    if (ids.includes(id) && !seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }
  return ordered.length > 0 ? ordered : [...ALL_PHRASE_IDS];
}
