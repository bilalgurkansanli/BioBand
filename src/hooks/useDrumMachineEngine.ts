import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import type { DrumMachineTypeId } from '../instruments/drumMachine/drumMachineBanks';
import {
  initDrumsEngine,
  releaseDrumsEngine,
  setDrumKit,
} from '../instruments/drums/drumsEngine';
import {
  initGuitarEngine,
  releaseGuitarEngine,
} from '../instruments/guitar/guitarEngine';
import { initPadsEngine, releasePadsEngine } from '../instruments/pads/padsEngine';
import { initPianoEngine, releasePianoEngine } from '../instruments/piano/pianoEngine';
import {
  initViolinEngine,
  releaseViolinEngine,
} from '../instruments/violin/violinEngine';

async function initForType(typeId: DrumMachineTypeId): Promise<void> {
  switch (typeId) {
    case 'drums':
      await initDrumsEngine();
      setDrumKit('acoustic');
      return;
    case 'piano':
      await initPianoEngine();
      return;
    case 'guitar':
      await initGuitarEngine();
      return;
    case 'violin':
      await initViolinEngine();
      return;
    case 'pads':
      await initPadsEngine();
      return;
  }
}

function releaseForType(typeId: DrumMachineTypeId): void {
  switch (typeId) {
    case 'drums':
      releaseDrumsEngine();
      return;
    case 'piano':
      releasePianoEngine();
      return;
    case 'guitar':
      releaseGuitarEngine();
      return;
    case 'violin':
      releaseViolinEngine();
      return;
    case 'pads':
      releasePadsEngine();
      return;
  }
}

export function useDrumMachineEngine(typeId: DrumMachineTypeId) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReady(false);
      setError(null);

      initForType(typeId)
        .then(() => {
          if (active) {
            setReady(true);
          }
        })
        .catch((err: unknown) => {
          console.error('Drum machine engine init failed:', err);
          if (active) {
            setError(err instanceof Error ? err.message : 'init failed');
            setReady(false);
          }
        });

      return () => {
        active = false;
        releaseForType(typeId);
        setReady(false);
      };
    }, [typeId]),
  );

  return { ready, error };
}
