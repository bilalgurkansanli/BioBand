import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import { acquireEngine, releaseEngine } from '../audio/engineRegistry';
import {
  noteOff as engineNoteOff,
  noteOn as engineNoteOn,
  playNote as enginePlayNote,
  setPianoToneOffset,
  setPianoVoice,
  setSustainPedal as engineSetSustainPedal,
} from '../instruments/piano/pianoEngine';
import type { NoteId } from '../instruments/piano/pianoNotes';
import type { PianoVoiceId } from '../instruments/piano/pianoVoices';
import type { NotePerformance } from '../instruments/shared/songPerformance';

export function usePianoEngine(
  toneOffsetSemitones = 0,
  voiceId: PianoVoiceId = 'acoustic',
) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPianoToneOffset(toneOffsetSemitones);
  }, [toneOffsetSemitones]);

  useEffect(() => {
    setPianoVoice(voiceId);
  }, [voiceId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReady(false);
      setError(null);

      acquireEngine('piano')
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
        releaseEngine('piano');
        setReady(false);
      };
    }, []),
  );

  /** One-shot (tutorial / play-along demos). */
  const playNote = useCallback(
    (noteId: NoteId, performance?: NotePerformance) => {
      enginePlayNote(noteId, toneOffsetSemitones, voiceId, 1, performance);
    },
    [toneOffsetSemitones, voiceId],
  );

  /** Interactive finger press — held until noteOff / sustain release. */
  const noteOn = useCallback(
    (noteId: NoteId) => {
      engineNoteOn(noteId, toneOffsetSemitones, voiceId);
    },
    [toneOffsetSemitones, voiceId],
  );

  const noteOff = useCallback(
    (noteId: NoteId) => {
      engineNoteOff(noteId, voiceId);
    },
    [voiceId],
  );

  const setSustainPedal = useCallback((on: boolean) => {
    engineSetSustainPedal(on);
  }, []);

  return { ready, error, playNote, noteOn, noteOff, setSustainPedal };
}
