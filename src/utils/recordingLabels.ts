import type Ionicons from '@expo/vector-icons/Ionicons';

import type { InstrumentId } from '../types/recording';

export const INSTRUMENT_TITLE_KEYS: Record<InstrumentId, string> = {
  piano: 'instruments.piano',
  drums: 'instruments.drums',
  guitar: 'instruments.guitar',
  violin: 'instruments.violin',
  pads: 'instruments.pads',
};

export const INSTRUMENT_ICONS: Record<InstrumentId, keyof typeof Ionicons.glyphMap> = {
  piano: 'keypad',
  drums: 'disc',
  guitar: 'musical-note',
  violin: 'musical-notes',
  pads: 'grid',
};

/**
 * One brand color per instrument, used to tint studio timeline clips and track
 * headers. Chosen to sit in the same family as each instrument's own accents.
 */
export const INSTRUMENT_COLORS: Record<InstrumentId, string> = {
  piano: '#8B7CFF',
  drums: '#E76F51',
  guitar: '#F4A261',
  violin: '#8ECAE6',
  pads: '#2A9D8F',
};
