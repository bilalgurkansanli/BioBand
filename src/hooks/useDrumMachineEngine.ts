import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { DrumMachineTypeId } from '../instruments/drumMachine/drumMachineBanks';
import {
  initDrumsEngine,
  releaseDrumsEngine,
  setDrumKit,
} from '../instruments/drums/drumsEngine';
import type { DrumKitId } from '../instruments/drums/drumsKits';
import {
  initGuitarEngine,
  releaseGuitarEngine,
} from '../instruments/guitar/guitarEngine';
import {
  initPadsEngine,
  releasePadsEngine,
  setPadBank,
} from '../instruments/pads/padsEngine';
import { initPianoEngine, releasePianoEngine } from '../instruments/piano/pianoEngine';
import { applyPianoFxSettings, PIANO_FX_DEFAULTS } from '../instruments/piano/pianoFx';
import {
  initViolinEngine,
  releaseViolinEngine,
} from '../instruments/violin/violinEngine';

async function initForType(
  typeId: DrumMachineTypeId,
  drumKitId: DrumKitId,
): Promise<void> {
  // The FX graph is global — leftover echo/reverb from the instrument screens
  // must not color the sequencer. Each instrument screen re-applies its own
  // saved FX on focus, so resetting here is safe.
  applyPianoFxSettings(PIANO_FX_DEFAULTS);

  switch (typeId) {
    case 'drums':
      await initDrumsEngine();
      // The machine's own kit setting — saved takes stamp the same kit id,
      // so live sound and playback keep matching.
      setDrumKit(drumKitId);
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
      // 'drums' bank on purpose: triggerPad plays whatever bank the Pads
      // screen last left active, while saved patterns play back on 'drums' —
      // pin it so live sound and playback match.
      setPadBank('drums');
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

export function useDrumMachineEngine(
  typeId: DrumMachineTypeId,
  drumKitId: DrumKitId = 'acoustic',
) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read through a ref so kit changes don't tear the engine down — the hook
  // owner applies them live via setDrumKit.
  const kitRef = useRef(drumKitId);
  kitRef.current = drumKitId;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReady(false);
      setError(null);

      initForType(typeId, kitRef.current)
        .then(() => {
          if (!active) {
            // Blur or type switch already released this engine while samples
            // were still loading — undo the late init so it doesn't linger
            // half-initialized behind the next engine.
            releaseForType(typeId);
            return;
          }
          setReady(true);
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

  // The focus init can start before the saved settings resolve (both are
  // async), so it may have applied the default kit — re-apply the real one
  // once the engine is up, and again whenever the user switches kits.
  useEffect(() => {
    if (ready && typeId === 'drums') {
      setDrumKit(drumKitId);
    }
  }, [drumKitId, ready, typeId]);

  return { ready, error };
}
