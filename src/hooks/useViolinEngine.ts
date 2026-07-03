import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import type { PhraseId } from '../instruments/violin/violinPhrases';
import {
  initViolinEngine,
  playNote as enginePlayNote,
  playPhrase as enginePlayPhrase,
  releaseViolinEngine,
} from '../instruments/violin/violinEngine';
import type { ViolinStringId } from '../instruments/violin/violinSounds';

export function useViolinEngine() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReady(false);
      setError(null);

      initViolinEngine()
        .then(() => {
          if (active) {
            setReady(true);
          }
        })
        .catch((err: unknown) => {
          console.error('Violin engine init failed:', err);
          if (active) {
            setError(err instanceof Error ? err.message : 'init failed');
            setReady(false);
          }
        });

      return () => {
        active = false;
        releaseViolinEngine();
        setReady(false);
      };
    }, []),
  );

  const playNote = useCallback((stringId: ViolinStringId, position: number) => {
    enginePlayNote(stringId, position);
  }, []);

  const playPhrase = useCallback((phraseId: PhraseId) => {
    enginePlayPhrase(phraseId);
  }, []);

  return { ready, error, playNote, playPhrase };
}
