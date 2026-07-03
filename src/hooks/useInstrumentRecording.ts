import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';

import { prepareRecordingAudioMode, restorePlaybackAudioMode } from '../audio/initAudio';
import { saveRecording } from '../storage/recordingsStorage';
import type { InstrumentEvent, InstrumentId, RecordingMode } from '../types/recording';

export function useInstrumentRecording(instrument: InstrumentId) {
  const { t } = useTranslation();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<RecordingMode | null>(null);

  const startTimeRef = useRef(0);
  const eventsRef = useRef<InstrumentEvent[]>([]);

  const startInstrumentRecording = useCallback(() => {
    startTimeRef.current = Date.now();
    eventsRef.current = [];
    setMode('instrument');
    setIsRecording(true);
  }, []);

  const startMicRecording = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert(t('recording.permissionDenied'));
      return;
    }

    await prepareRecordingAudioMode();
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    startTimeRef.current = Date.now();
    setMode('microphone');
    setIsRecording(true);
  }, [audioRecorder, t]);

  const stopRecording = useCallback(async () => {
    const durationMs = Date.now() - startTimeRef.current;
    const currentMode = mode;

    if (currentMode === 'microphone') {
      await audioRecorder.stop();
      await saveRecording({
        id: `${Date.now()}`,
        createdAt: Date.now(),
        instrument,
        mode: 'microphone',
        durationMs,
        audioUri: audioRecorder.uri ?? undefined,
      });
    } else if (currentMode === 'instrument') {
      await saveRecording({
        id: `${Date.now()}`,
        createdAt: Date.now(),
        instrument,
        mode: 'instrument',
        durationMs,
        events: [...eventsRef.current],
      });
    }

    await restorePlaybackAudioMode();

    setIsRecording(false);
    setMode(null);
    eventsRef.current = [];
  }, [audioRecorder, instrument, mode]);

  const captureEvent = useCallback(
    (soundId: string) => {
      if (!isRecording || mode !== 'instrument') {
        return;
      }

      eventsRef.current.push({
        soundId,
        atMs: Date.now() - startTimeRef.current,
      });
    },
    [isRecording, mode],
  );

  const handleRecordPress = useCallback(() => {
    if (isRecording) {
      void stopRecording();
      return;
    }

    Alert.alert(t('recording.chooseModeTitle'), t('recording.chooseModeMessage'), [
      { text: t('recording.modeInstrument'), onPress: startInstrumentRecording },
      { text: t('recording.modeMicrophone'), onPress: () => void startMicRecording() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [isRecording, startInstrumentRecording, startMicRecording, stopRecording, t]);

  return {
    isRecording,
    mode,
    handleRecordPress,
    captureEvent,
  };
}
