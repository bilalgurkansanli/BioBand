import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import {
  initPadsEngine,
  releasePadsEngine,
  setPadBank as engineSetPadBank,
  triggerPad as engineTriggerPad,
} from '../instruments/pads/padsEngine';
import type { PadBankId } from '../instruments/pads/padsBanks';
import type { PadSoundId } from '../instruments/pads/padsSounds';

export function usePadsEngine(bankId: PadBankId = 'drums') {
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
            engineSetPadBank(bankId);
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
      // bankId applied in a separate effect while focused — do not re-init samples.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- focus lifecycle only
    }, []),
  );

  useEffect(() => {
    if (ready) {
      engineSetPadBank(bankId);
    }
  }, [bankId, ready]);

  const triggerPad = useCallback((id: PadSoundId, velocity = 1) => {
    engineTriggerPad(id, velocity);
  }, []);

  return { ready, error, triggerPad };
}
