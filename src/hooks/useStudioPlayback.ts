import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  playStudioProject,
  releaseStudioPlaybackResources,
  stopStudioPlayback,
  type StudioPlaybackHandle,
} from '../audio/studioPlayer';
import type { StudioProject } from '../types/studio';

export function useStudioPlayback() {
  const { t } = useTranslation();
  const [playingProjectId, setPlayingProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const handleRef = useRef<StudioPlaybackHandle | null>(null);
  const playingIdRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    stopStudioPlayback();
    playingIdRef.current = null;
    setPlayingProjectId(null);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stop();
      };
    }, [stop]),
  );

  useEffect(() => {
    return () => {
      releaseStudioPlaybackResources();
    };
  }, []);

  const play = useCallback(
    async (project: StudioProject) => {
      if (playingIdRef.current === project.id) {
        stop();
        return;
      }

      stop();
      setLoading(true);

      try {
        const handle = await playStudioProject(project, {
          onEnded: () => {
            if (playingIdRef.current === project.id) {
              playingIdRef.current = null;
              handleRef.current = null;
              setPlayingProjectId(null);
            }
          },
        });
        handleRef.current = handle;
        playingIdRef.current = project.id;
        setPlayingProjectId(project.id);
      } catch {
        Alert.alert(t('studio.playbackError'));
        playingIdRef.current = null;
        handleRef.current = null;
        setPlayingProjectId(null);
      } finally {
        setLoading(false);
      }
    },
    [stop, t],
  );

  return {
    playingProjectId,
    loading,
    play,
    stop,
    isPlaying: playingProjectId !== null,
  };
}
