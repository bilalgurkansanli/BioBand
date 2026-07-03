import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import {
  initPianoEngine,
  playNote as enginePlayNote,
  releasePianoEngine,
  setPianoToneOffset,
} from '../instruments/piano/pianoEngine';
import type { NoteId } from '../instruments/piano/pianoNotes';

export function usePianoEngine(toneOffsetSemitones = 0) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPianoToneOffset(toneOffsetSemitones);
  }, [toneOffsetSemitones]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReady(false);
      setError(null);

      initPianoEngine()
        .then(() => {
          if (active) {
            setReady(true);
          }
        })
        .catch((err: unknown) => {
          console.error('Piano engine init failed:', err);
          if (active) {
            setError(err instanceof Error ? err.message : 'init failed');
            setReady(false);
          }
        });

      return () => {
        active = false;
        releasePianoEngine();
        setReady(false);
      };
    }, []),
  );

  const playNote = useCallback(
    (noteId: NoteId) => {
      enginePlayNote(noteId, toneOffsetSemitones);
    },
    [toneOffsetSemitones],
  );

  return { ready, error, playNote };
}
