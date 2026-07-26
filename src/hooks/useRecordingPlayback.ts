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

/**
 * Speeds offered by the scrubber's tempo button. Half speed is the slowest
 * that still holds a melody together; anything faster than 1.5 stops being
 * useful for hearing what you played.
 */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5] as const;

export function useRecordingPlayback() {
  const { t } = useTranslation();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const handleRef = useRef<RecordingPlaybackHandle | null>(null);
  const playingIdRef = useRef<string | null>(null);
  // The take currently on air, and where it had got to. Changing speed
  // restarts playback, and it has to resume where the user was listening.
  const playingRecordingRef = useRef<SavedRecording | null>(null);
  const positionRef = useRef(0);
  const rateRef = useRef(1);
  // Survives the restart a speed change forces, and is read when a new take
  // starts — arming loop once keeps it armed.
  const loopRef = useRef(false);

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    stopRecordingPlayback();
    playingIdRef.current = null;
    playingRecordingRef.current = null;
    positionRef.current = 0;
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

  /** Starts a take from `startAtMs`, at whatever speed is currently selected. */
  const start = useCallback(
    async (recording: SavedRecording, startAtMs: number) => {
      setLoadingId(recording.id);
      setPositionMs(startAtMs);
      positionRef.current = startAtMs;
      setDurationMs(recording.durationMs);

      try {
        const handle = await playSavedRecording(
          recording,
          () => {
            if (playingIdRef.current === recording.id) {
              playingIdRef.current = null;
              playingRecordingRef.current = null;
              handleRef.current = null;
              positionRef.current = 0;
              setPlayingId(null);
              setPositionMs(0);
            }
          },
          (position, duration) => {
            if (playingIdRef.current === recording.id) {
              positionRef.current = position;
              setPositionMs(position);
              setDurationMs(duration);
            }
          },
          { loop: loopRef.current, rate: rateRef.current },
        );
        handleRef.current = handle;
        playingIdRef.current = recording.id;
        playingRecordingRef.current = recording;
        setPlayingId(recording.id);
        if (startAtMs > 0) {
          handle.seek(startAtMs);
        }
      } catch {
        Alert.alert(t('recordings.playbackError'));
        playingIdRef.current = null;
        playingRecordingRef.current = null;
        handleRef.current = null;
        setPlayingId(null);
      } finally {
        setLoadingId(null);
      }
    },
    [t],
  );

  const play = useCallback(
    async (recording: SavedRecording) => {
      if (playingIdRef.current === recording.id) {
        stop();
        return;
      }

      stop();
      await start(recording, 0);
    },
    [start, stop],
  );

  const seek = useCallback((position: number) => {
    if (!playingIdRef.current) {
      return;
    }
    handleRef.current?.seek(position);
    positionRef.current = position;
    setPositionMs(position);
  }, []);

  /**
   * Step to the next speed. Neither the scheduler nor the file player can have
   * its rate changed underneath a running playback, so this restarts the take —
   * from where it was, not from the top.
   */
  const cycleRate = useCallback(() => {
    const index = PLAYBACK_RATES.indexOf(rateRef.current as (typeof PLAYBACK_RATES)[number]);
    const next = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
    rateRef.current = next;
    setRate(next);

    const recording = playingRecordingRef.current;
    if (!recording) {
      return;
    }
    const resumeAt = positionRef.current;
    handleRef.current?.stop();
    handleRef.current = null;
    stopRecordingPlayback();
    playingIdRef.current = null;
    playingRecordingRef.current = null;
    void start(recording, resumeAt);
  }, [start]);

  /**
   * Applied to the live handle rather than restarting: arming loop halfway
   * through a take should not jump it back to the beginning.
   */
  const toggleLoop = useCallback(() => {
    const next = !loopRef.current;
    loopRef.current = next;
    setLoop(next);
    handleRef.current?.setLoop(next);
  }, []);

  return {
    playingId,
    loadingId,
    positionMs,
    durationMs,
    rate,
    cycleRate,
    loop,
    toggleLoop,
    play,
    stop,
    seek,
  };
}
