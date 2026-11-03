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
import { getProjectDurationMs, type StudioProject } from '../types/studio';

export function useStudioPlayback() {
  const { t } = useTranslation();
  const [playingProjectId, setPlayingProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const handleRef = useRef<StudioPlaybackHandle | null>(null);
  const playingIdRef = useRef<string | null>(null);
  const positionRef = useRef(0);
  positionRef.current = positionMs;
  // Bumped by every play and stop: a play that resolves after a newer play
  // or a stop must not claim the "playing" state for itself.
  const playTokenRef = useRef(0);

  const stop = useCallback((rewind = true) => {
    playTokenRef.current += 1;
    handleRef.current?.stop();
    handleRef.current = null;
    stopStudioPlayback();
    playingIdRef.current = null;
    setPlayingProjectId(null);
    setLoading(false);
    if (rewind) {
      setPositionMs(0);
    }
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
    async (
      project: StudioProject,
      options?: { startAtMs?: number; loop?: boolean; rate?: number },
    ) => {
      if (playingIdRef.current === project.id) {
        stop();
        return;
      }

      // Leave the playhead where it is so a fresh play resumes from it.
      stop(false);
      const token = ++playTokenRef.current;
      setLoading(true);
      // A project with nothing audible reports its end synchronously, before
      // the code below marks it as playing — remembered so it never is.
      let endedEarly = false;

      const total = getProjectDurationMs(project);
      setDurationMs(total);
      let from = options?.startAtMs ?? positionRef.current;
      if (from >= total || from < 0) {
        from = 0;
      }
      setPositionMs(from);

      try {
        const handle = await playStudioProject(project, {
          startAtMs: from,
          loop: options?.loop ?? false,
          rate: options?.rate ?? 1,
          onProgress: (pos, dur) => {
            setPositionMs(pos);
            setDurationMs(dur);
          },
          onEnded: () => {
            if (playingIdRef.current === null && playTokenRef.current === token) {
              endedEarly = true;
            }
            if (playingIdRef.current === project.id) {
              playingIdRef.current = null;
              handleRef.current = null;
              setPlayingProjectId(null);
              setPositionMs(0);
            }
          },
        });
        if (playTokenRef.current !== token) {
          // Stopped or replaced while the mix was loading.
          return;
        }
        if (endedEarly) {
          setPositionMs(0);
          return;
        }
        handleRef.current = handle;
        playingIdRef.current = project.id;
        setPlayingProjectId(project.id);
      } catch {
        if (playTokenRef.current !== token) {
          return;
        }
        Alert.alert(t('studio.playbackError'));
        playingIdRef.current = null;
        handleRef.current = null;
        setPlayingProjectId(null);
      } finally {
        if (playTokenRef.current === token) {
          setLoading(false);
        }
      }
    },
    [stop, t],
  );

  const seek = useCallback((ms: number) => {
    const clamped = Math.max(0, ms);
    setPositionMs(clamped);
    handleRef.current?.seek(clamped);
  }, []);

  return {
    playingProjectId,
    loading,
    play,
    stop,
    seek,
    positionMs,
    durationMs,
    isPlaying: playingProjectId !== null,
  };
}
