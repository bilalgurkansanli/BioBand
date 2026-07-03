import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import {
  initDrumsEngine,
  playHit as enginePlayHit,
  releaseDrumsEngine,
} from '../instruments/drums/drumsEngine';
import type { DrumSoundId } from '../instruments/drums/drumsSounds';

export function useDrumsEngine() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReady(false);
      setError(null);

      initDrumsEngine()
        .then(() => {
          if (active) {
            setReady(true);
          }
        })
        .catch((err: unknown) => {
          console.error('Drums engine init failed:', err);
          if (active) {
            setError(err instanceof Error ? err.message : 'init failed');
            setReady(false);
          }
        });

      return () => {
        active = false;
        releaseDrumsEngine();
        setReady(false);
      };
    }, []),
  );

  const playHit = useCallback((id: DrumSoundId) => {
    enginePlayHit(id);
  }, []);

  return { ready, error, playHit };
}
