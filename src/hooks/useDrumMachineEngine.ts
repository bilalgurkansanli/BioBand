import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { acquireEngine, releaseEngine } from '../audio/engineRegistry';
import type { DrumMachineTypeId } from '../instruments/drumMachine/drumMachineBanks';
import { setDrumKit } from '../instruments/drums/drumsEngine';
import type { DrumKitId } from '../instruments/drums/drumsKits';
import { setPadBank } from '../instruments/pads/padsEngine';
import { applyPianoFxSettings, PIANO_FX_DEFAULTS } from '../instruments/piano/pianoFx';

async function acquireForType(
  typeId: DrumMachineTypeId,
  drumKitId: DrumKitId,
): Promise<void> {
  // The FX graph is global — leftover echo/reverb from the instrument screens
  // must not color the sequencer. Each instrument screen re-applies its own
  // saved FX on focus, so resetting here is safe.
  applyPianoFxSettings(PIANO_FX_DEFAULTS);

  await acquireEngine(typeId);

  if (typeId === 'drums') {
    // The machine's own kit setting — saved takes stamp the same kit id,
    // so live sound and playback keep matching.
    setDrumKit(drumKitId);
  }
  if (typeId === 'pads') {
    // 'drums' bank on purpose: triggerPad plays whatever bank the Pads
    // screen last left active, while saved patterns play back on 'drums' —
    // pin it so live sound and playback match.
    setPadBank('drums');
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

      acquireForType(typeId, kitRef.current)
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
        releaseEngine(typeId);
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
