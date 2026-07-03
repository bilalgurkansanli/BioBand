import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import {
  initPadsEngine,
  releasePadsEngine,
  triggerPad as engineTriggerPad,
} from '../instruments/pads/padsEngine';
import type { PadSoundId } from '../instruments/pads/padsSounds';

export function usePadsEngine() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReady(false);
      setError(null);

      initPadsEngine()
        .then(() => {
          if (active) {
            setReady(true);
          }
        })
        .catch((err: unknown) => {
          console.error('Pads engine init failed:', err);
          if (active) {
            setError(err instanceof Error ? err.message : 'init failed');
            setReady(false);
          }
        });

      return () => {
        active = false;
        releasePadsEngine();
        setReady(false);
      };
    }, []),
  );

  const triggerPad = useCallback((id: PadSoundId) => {
    engineTriggerPad(id);
  }, []);

  return { ready, error, triggerPad };
}
