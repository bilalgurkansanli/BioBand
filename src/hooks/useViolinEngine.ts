import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import type { PhraseId } from '../instruments/violin/violinPhrases';
import {
  initViolinEngine,
  playNote as enginePlayNote,
  playPhrase as enginePlayPhrase,
  playViolinSoundId,
  releaseViolinEngine,
  setViolinVoice as engineSetViolinVoice,
} from '../instruments/violin/violinEngine';
import type { ViolinStringId } from '../instruments/violin/violinSounds';
import type { ViolinVoiceId } from '../instruments/violin/violinVoices';

export function useViolinEngine(voiceId: ViolinVoiceId = 'classic') {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReady(false);
      setError(null);

      initViolinEngine()
        .then(() => {
          if (active) {
            engineSetViolinVoice(voiceId);
            setReady(true);
          }
        })
        .catch((err: unknown) => {
          console.error('Violin engine init failed:', err);
          if (active) {
            setError(err instanceof Error ? err.message : 'init failed');
            setReady(false);
          }
        });

      return () => {
        active = false;
        releaseViolinEngine();
        setReady(false);
      };
      // voiceId applied in a separate effect while focused — do not re-init samples.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- focus lifecycle only
    }, []),
  );

  useEffect(() => {
    if (ready) {
      engineSetViolinVoice(voiceId);
    }
  }, [voiceId, ready]);

  const playNote = useCallback((stringId: ViolinStringId, position: number) => {
    enginePlayNote(stringId, position);
  }, []);

  const playPhrase = useCallback((phraseId: PhraseId) => {
    enginePlayPhrase(phraseId);
  }, []);

  const playSoundId = useCallback((soundId: string) => {
    playViolinSoundId(soundId);
  }, []);

  return { ready, error, playNote, playPhrase, playSoundId };
}
