import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  playSavedRecording,
  releaseRecordingPlaybackResources,
  stopRecordingPlayback,
  type RecordingPlaybackHandle,
} from '../audio/recordingPlayer';
import type { SavedRecording } from '../types/recording';

export function useRecordingPlayback() {
  const { t } = useTranslation();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const handleRef = useRef<RecordingPlaybackHandle | null>(null);
  const playingIdRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    stopRecordingPlayback();
    playingIdRef.current = null;
    setPlayingId(null);
    setLoadingId(null);
    setPositionMs(0);
    setDurationMs(0);
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
      releaseRecordingPlaybackResources();
    };
  }, []);

  const play = useCallback(
    async (recording: SavedRecording) => {
      if (playingIdRef.current === recording.id) {
        stop();
        return;
      }

      stop();
      setLoadingId(recording.id);
      setPositionMs(0);
      setDurationMs(recording.durationMs);

      try {
        const handle = await playSavedRecording(
          recording,
          () => {
            if (playingIdRef.current === recording.id) {
              playingIdRef.current = null;
              handleRef.current = null;
              setPlayingId(null);
              setPositionMs(0);
            }
          },
          (position, duration) => {
            if (playingIdRef.current === recording.id) {
              setPositionMs(position);
              setDurationMs(duration);
            }
          },
        );
        handleRef.current = handle;
        playingIdRef.current = recording.id;
        setPlayingId(recording.id);
      } catch {
        Alert.alert(t('recordings.playbackError'));
        playingIdRef.current = null;
        handleRef.current = null;
        setPlayingId(null);
      } finally {
        setLoadingId(null);
      }
    },
    [stop, t],
  );

  const seek = useCallback((position: number) => {
    if (!playingIdRef.current) {
      return;
    }
    handleRef.current?.seek(position);
    setPositionMs(position);
  }, []);

  return {
    playingId,
    loadingId,
    positionMs,
    durationMs,
    play,
    stop,
    seek,
  };
}
