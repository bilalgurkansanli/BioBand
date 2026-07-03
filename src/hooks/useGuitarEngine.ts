import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import type { ChordId } from '../instruments/guitar/guitarChords';
import {
  initGuitarEngine,
  pluckString as enginePluckString,
  releaseGuitarEngine,
  strumChord as engineStrumChord,
} from '../instruments/guitar/guitarEngine';
import type { GuitarStringId } from '../instruments/guitar/guitarSounds';

export function useGuitarEngine() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReady(false);
      setError(null);

      initGuitarEngine()
        .then(() => {
          if (active) {
            setReady(true);
          }
        })
        .catch((err: unknown) => {
          console.error('Guitar engine init failed:', err);
          if (active) {
            setError(err instanceof Error ? err.message : 'init failed');
            setReady(false);
          }
        });

      return () => {
        active = false;
        releaseGuitarEngine();
        setReady(false);
      };
    }, []),
  );

  const pluckString = useCallback((stringId: GuitarStringId) => {
    enginePluckString(stringId);
  }, []);

  const strumChord = useCallback((chordId: ChordId) => {
    engineStrumChord(chordId, 'down');
  }, []);

  return { ready, error, pluckString, strumChord };
}
