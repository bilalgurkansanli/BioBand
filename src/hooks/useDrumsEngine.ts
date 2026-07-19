import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import {
  initDrumsEngine,
  playHit as enginePlayHit,
  releaseDrumsEngine,
  setDrumKit as engineSetDrumKit,
} from '../instruments/drums/drumsEngine';
import type { DrumKitId } from '../instruments/drums/drumsKits';
import type { DrumSoundId } from '../instruments/drums/drumsSounds';

export function useDrumsEngine(kitId: DrumKitId = 'acoustic') {
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
            engineSetDrumKit(kitId);
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
      // kitId applied in a separate effect while focused — do not re-init samples.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- focus lifecycle only
    }, []),
  );

  useEffect(() => {
    if (ready) {
      engineSetDrumKit(kitId);
    }
  }, [kitId, ready]);

  const playHit = useCallback((id: DrumSoundId, velocity?: number) => {
    enginePlayHit(id, velocity);
  }, []);

  return { ready, error, playHit };
}
