import type { Ionicons } from '@expo/vector-icons';

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
