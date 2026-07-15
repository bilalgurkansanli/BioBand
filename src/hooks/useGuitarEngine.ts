import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import type { ChordId } from '../instruments/guitar/guitarChords';
import {
  initGuitarEngine,
  playGuitarSoundId,
  pluckString as enginePluckString,
  releaseGuitarEngine,
  setGuitarVoice as engineSetGuitarVoice,
  strumChord as engineStrumChord,
} from '../instruments/guitar/guitarEngine';
import type { GuitarStringId } from '../instruments/guitar/guitarSounds';
import type { GuitarVoiceId } from '../instruments/guitar/guitarVoices';

export function useGuitarEngine(voiceId: GuitarVoiceId = 'nylon') {
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
            engineSetGuitarVoice(voiceId);
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
      // voiceId applied in a separate effect while focused — do not re-init samples.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- focus lifecycle only
    }, []),
  );

  useEffect(() => {
    if (ready) {
      engineSetGuitarVoice(voiceId);
    }
  }, [voiceId, ready]);

  const pluckString = useCallback((stringId: GuitarStringId, fret = 0) => {
    enginePluckString(stringId, fret);
  }, []);

  const strumChord = useCallback((chordId: ChordId) => {
    engineStrumChord(chordId, 'down');
  }, []);

  const playSoundId = useCallback((soundId: string) => {
    playGuitarSoundId(soundId);
  }, []);

  return { ready, error, pluckString, strumChord, playSoundId };
}
