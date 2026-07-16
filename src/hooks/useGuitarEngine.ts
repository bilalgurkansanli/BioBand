import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import type { ChordId } from '../instruments/guitar/guitarChords';
import type {
  GuitarChordGesture,
  GuitarChordPlayMode,
} from '../instruments/guitar/guitarChordPatterns';
import {
  initGuitarEngine,
  noteOff as engineNoteOff,
  noteOn as engineNoteOn,
  playChord as enginePlayChord,
  playGuitarSoundId,
  pluckString as enginePluckString,
  releaseGuitarEngine,
  setGuitarVoice as engineSetGuitarVoice,
  strumChord as engineStrumChord,
  type GuitarStrumDirection,
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

  const pluckString = useCallback(
    (stringId: GuitarStringId, fret = 0, velocity?: number) => {
      enginePluckString(stringId, fret, { velocity });
    },
    [],
  );

  const noteOn = useCallback(
    (stringId: GuitarStringId, fret = 0, velocity?: number) => {
      engineNoteOn(stringId, fret, velocity);
    },
    [],
  );

  const noteOff = useCallback((stringId: GuitarStringId, fret = 0) => {
    engineNoteOff(stringId, fret);
  }, []);

  const playChord = useCallback(
    (
      chordId: ChordId,
      options?: {
        mode?: GuitarChordPlayMode;
        direction?: GuitarStrumDirection;
        gesture?: GuitarChordGesture;
      },
    ) => {
      enginePlayChord(chordId, options);
    },
    [],
  );

  const strumChord = useCallback(
    (chordId: ChordId, direction: GuitarStrumDirection = 'down') => {
      engineStrumChord(chordId, direction);
    },
    [],
  );

  const playSoundId = useCallback((soundId: string) => {
    playGuitarSoundId(soundId);
  }, []);

  return {
    ready,
    error,
    pluckString,
    noteOn,
    noteOff,
    playChord,
    strumChord,
    playSoundId,
  };
}

export type { GuitarStrumDirection, GuitarChordPlayMode, GuitarChordGesture };
