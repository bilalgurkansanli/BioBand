import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';

import {
  prepareOverdubRecordingAudioMode,
  prepareRecordingAudioMode,
  restorePlaybackAudioMode,
} from '../audio/initAudio';
import { OptionListModal } from '../components/studio/OptionListModal';
import {
  playStudioProject,
  stopStudioPlayback,
  type StudioPlaybackHandle,
} from '../audio/studioPlayer';
import { getCurrentDrumKitId } from '../instruments/drums/drumsEngine';
import { getCurrentGuitarVoiceId } from '../instruments/guitar/guitarEngine';
import { getCurrentPadBankId } from '../instruments/pads/padsEngine';
import { getCurrentViolinVoiceId } from '../instruments/violin/violinEngine';
import { awardRecordingPractice } from '../profile/awardPlayAlong';
import { saveRecording } from '../storage/recordingsStorage';
import { appendRecordedTrack, getStudioProject } from '../storage/studioProjectsStorage';
import {
  clearStudioOverdubSession,
  getStudioOverdubSession,
  subscribeStudioOverdubSession,
  type StudioOverdubSession,
} from '../studio/studioOverdubSession';
import { notifyStudioTrackAdded } from '../studio/studioTrackAddedSignal';
import type { InstrumentEvent, InstrumentId, RecordingMode, SavedRecording } from '../types/recording';
import type { RootTabParamList } from '../types/navigation';
import { recordFeatureUse } from '../storage/profileProgressStorage';

const COUNTDOWN_SECONDS = 3;

export function useInstrumentRecording(instrument: InstrumentId) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<RecordingMode | null>(null);
  const [studioSession, setStudioSession] = useState<StudioOverdubSession | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showModePicker, setShowModePicker] = useState(false);

  const startTimeRef = useRef(0);
  const eventsRef = useRef<InstrumentEvent[]>([]);
  const bedsHandleRef = useRef<StudioPlaybackHandle | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const studioArmed = studioSession?.active && studioSession.instrument === instrument;

  useEffect(() => {
    return subscribeStudioOverdubSession((session) => {
      if (session?.active && session.instrument === instrument) {
        setStudioSession(session);
      } else {
        setStudioSession(null);
      }
    });
  }, [instrument]);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);

  const stopBeds = useCallback(() => {
    bedsHandleRef.current?.stop();
    bedsHandleRef.current = null;
    stopStudioPlayback();
  }, []);

  const navigateBackToStudio = useCallback(
    (projectId: string) => {
      navigation.navigate('Recordings', {
        screen: 'StudioProject',
        params: { projectId },
      });
    },
    [navigation],
  );

  const startInstrumentRecording = useCallback(() => {
    startTimeRef.current = Date.now();
    eventsRef.current = [];
    setMode('instrument');
    setIsRecording(true);
  }, []);

  const startMicRecording = useCallback(
    async (overdub: boolean) => {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(t('recording.permissionDenied'));
        return false;
      }

      if (overdub) {
        await prepareOverdubRecordingAudioMode();
      } else {
        await prepareRecordingAudioMode();
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      startTimeRef.current = Date.now();
      setMode('microphone');
      setIsRecording(true);
      return true;
    },
    [audioRecorder, t],
  );

  const finishSave = useCallback(
    async (currentMode: RecordingMode, durationMs: number): Promise<SavedRecording | null> => {
      const session = getStudioOverdubSession();
      const recordingId = `${Date.now()}`;

      if (currentMode === 'microphone') {
        const take: SavedRecording = {
          id: recordingId,
          createdAt: Date.now(),
          instrument,
          mode: 'microphone',
          durationMs,
          audioUri: audioRecorder.uri ?? undefined,
        };
        await saveRecording(take);
        void recordFeatureUse('recordingSaved');
        void awardRecordingPractice(instrument, durationMs);
        if (session?.active && session.instrument === instrument) {
          await appendRecordedTrack(session.projectId, take);
          clearStudioOverdubSession();
          setStudioSession(null);
          notifyStudioTrackAdded();
          navigateBackToStudio(session.projectId);
        }
        return take;
      }

      if (currentMode === 'instrument') {
        const take: SavedRecording = {
          id: recordingId,
          createdAt: Date.now(),
          instrument,
          mode: 'instrument',
          durationMs,
          events: [...eventsRef.current],
          // Drums/guitar/pads timbre depends on the kit/voice/bank — remember
          // it for playback.
          drumKitId: instrument === 'drums' ? getCurrentDrumKitId() : undefined,
          guitarVoiceId: instrument === 'guitar' ? getCurrentGuitarVoiceId() : undefined,
          violinVoiceId: instrument === 'violin' ? getCurrentViolinVoiceId() : undefined,
          padBankId: instrument === 'pads' ? getCurrentPadBankId() : undefined,
        };
        await saveRecording(take);
        void recordFeatureUse('recordingSaved');
        void awardRecordingPractice(instrument, durationMs);
        if (session?.active && session.instrument === instrument) {
          await appendRecordedTrack(session.projectId, take);
          clearStudioOverdubSession();
          setStudioSession(null);
          notifyStudioTrackAdded();
          navigateBackToStudio(session.projectId);
        }
        return take;
      }

      return null;
    },
    [audioRecorder, instrument, navigateBackToStudio],
  );

  const stopRecording = useCallback(async () => {
    const durationMs = Date.now() - startTimeRef.current;
    const currentMode = mode;
    const wasStudio = !!getStudioOverdubSession()?.active;

    stopBeds();
    clearCountdown();

    if (currentMode === 'microphone') {
      try {
        await audioRecorder.stop();
      } catch {
        // Already stopped/released — keep tearing the session down.
      }
    }

    try {
      if (currentMode) {
        await finishSave(currentMode, durationMs);
      }
    } catch {
      // Saving can fail (e.g. device storage full). Tell the user instead of
      // failing silently — and still reset below, or the recorder would stay
      // stuck in "recording" with the audio mode left in capture state.
      Alert.alert(t('recording.saveError'));
    } finally {
      setIsRecording(false);
      setMode(null);
      eventsRef.current = [];
      try {
        await restorePlaybackAudioMode();
      } catch {
        // Best-effort — the UI is already unlocked.
      }
    }

    if (wasStudio && !getStudioOverdubSession()) {
      // Already navigated in finishSave.
    }
  }, [audioRecorder, clearCountdown, finishSave, mode, stopBeds, t]);

  const beginStudioCapture = useCallback(async () => {
    const session = getStudioOverdubSession();
    if (!session || session.instrument !== instrument) {
      return;
    }

    const project = await getStudioProject(session.projectId);
    if (project && project.tracks.length > 0) {
      const handle = await playStudioProject(project);
      bedsHandleRef.current = handle;
    }

    if (session.mode === 'microphone') {
      const ok = await startMicRecording(true);
      if (!ok) {
        stopBeds();
      }
      return;
    }

    startInstrumentRecording();
  }, [instrument, startInstrumentRecording, startMicRecording, stopBeds]);

  const startStudioOverdub = useCallback(() => {
    clearCountdown();
    let remaining = COUNTDOWN_SECONDS;
    setCountdown(remaining);

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCountdown();
        void beginStudioCapture();
        return;
      }
      setCountdown(remaining);
    }, 1000);
  }, [beginStudioCapture, clearCountdown]);

  const cancelStudioOverdub = useCallback(() => {
    clearCountdown();
    stopBeds();
    clearStudioOverdubSession();
    setStudioSession(null);
  }, [clearCountdown, stopBeds]);

  const captureEvent = useCallback(
    (soundId: string, velocity?: number) => {
      if (!isRecording || mode !== 'instrument') {
        return;
      }

      eventsRef.current.push({
        soundId,
        atMs: Date.now() - startTimeRef.current,
        velocity,
      });
    },
    [isRecording, mode],
  );

  const handleRecordPress = useCallback(() => {
    if (isRecording) {
      void stopRecording();
      return;
    }

    if (countdown !== null) {
      return;
    }

    if (studioArmed && studioSession) {
      startStudioOverdub();
      return;
    }

    setShowModePicker(true);
  }, [countdown, isRecording, startStudioOverdub, stopRecording, studioArmed, studioSession]);

  const closeModePicker = useCallback(() => setShowModePicker(false), []);

  const selectRecordingMode = useCallback(
    (key: string) => {
      setShowModePicker(false);
      if (key === 'instrument') {
        startInstrumentRecording();
      } else {
        void startMicRecording(false);
      }
    },
    [startInstrumentRecording, startMicRecording],
  );

  const recordModePicker = createElement(OptionListModal, {
    visible: showModePicker,
    title: t('recording.chooseModeTitle'),
    message: t('recording.chooseModeMessage'),
    options: [
      { key: 'instrument', label: t('recording.modeInstrument'), icon: 'musical-notes' },
      { key: 'microphone', label: t('recording.modeMicrophone'), icon: 'mic' },
    ],
    onSelect: selectRecordingMode,
    onClose: closeModePicker,
  });

  useEffect(() => {
    return () => {
      clearCountdown();
      stopBeds();
    };
  }, [clearCountdown, stopBeds]);

  return {
    isRecording,
    mode,
    handleRecordPress,
    captureEvent,
    studioArmed: !!studioArmed,
    studioProjectTitle: studioSession?.projectTitle ?? null,
    countdown,
    cancelStudioOverdub,
    recordModePicker,
  };
}
