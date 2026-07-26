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
import { getSharedAudioContext } from '../audio/sampleBank';
import {
  getMetronomeBpm,
  scheduleCountInClickAt,
} from '../instruments/piano/pianoMetronome';
import { loadRecordingSettings } from '../storage/recordingSettingsStorage';
import { OptionListModal } from '../components/studio/OptionListModal';
import { Toast } from '../components/Toast';
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
import { persistRecordingAudio } from '../storage/recordingAudioStorage';
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
/** One bar of 4/4 — the count every musician already knows. */
const COUNT_IN_BEATS = 4;
/** Small lead so the first click is scheduled on the audio clock, never late. */
const COUNT_IN_LEAD_SECONDS = 0.12;

export function useInstrumentRecording(instrument: InstrumentId) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<RecordingMode | null>(null);
  const [studioSession, setStudioSession] = useState<StudioOverdubSession | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showModePicker, setShowModePicker] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [countInBeat, setCountInBeat] = useState<number | null>(null);

  const startTimeRef = useRef(0);
  const eventsRef = useRef<InstrumentEvent[]>([]);
  const bedsHandleRef = useRef<StudioPlaybackHandle | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countInCancelsRef = useRef<(() => void)[]>([]);
  const countInTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /**
   * A mic count-in has already claimed the recording audio session by the time
   * the clicks run. Aborting has to hand it back, or playback stays muted.
   */
  const countInHoldsMicSessionRef = useRef(false);
  const countInEnabledRef = useRef(true);
  const studioArmed = studioSession?.active && studioSession.instrument === instrument;

  useEffect(() => {
    let active = true;
    void loadRecordingSettings().then((settings) => {
      if (active) {
        countInEnabledRef.current = settings.countInEnabled;
      }
    });
    return () => {
      active = false;
    };
  }, []);

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

  const clearCountIn = useCallback(() => {
    // Clicks are already sitting on the audio clock — clearing the JS timers
    // alone would still let them sound after the user backed out.
    for (const cancel of countInCancelsRef.current) {
      cancel();
    }
    countInCancelsRef.current = [];
    for (const timer of countInTimersRef.current) {
      clearTimeout(timer);
    }
    countInTimersRef.current = [];
    setCountInBeat(null);
    if (countInHoldsMicSessionRef.current) {
      countInHoldsMicSessionRef.current = false;
      void restorePlaybackAudioMode();
    }
  }, []);

  /**
   * Click a bar in, then start. Onsets ride the audio clock (same mechanism as
   * the metronome) so the beat is steady even while the screen is busy; the
   * visible number is driven off the same anchor.
   */
  const runCountIn = useCallback(
    (begin: () => void, holdsMicSession = false) => {
      // Set *after* the reset: clearCountIn hands the mic session back, so
      // flagging it beforehand would release the one we just prepared.
      clearCountIn();
      countInHoldsMicSessionRef.current = holdsMicSession;
      const context = getSharedAudioContext();
      const now = context.currentTime;
      const beatSeconds = 60 / getMetronomeBpm();

      for (let beat = 0; beat < COUNT_IN_BEATS; beat += 1) {
        const offsetSeconds = COUNT_IN_LEAD_SECONDS + beat * beatSeconds;
        countInCancelsRef.current.push(
          // Accent the downbeat so four clicks read as a bar, not a queue.
          scheduleCountInClickAt(now + offsetSeconds, beat === 0),
        );
        countInTimersRef.current.push(
          setTimeout(() => setCountInBeat(COUNT_IN_BEATS - beat), offsetSeconds * 1000),
        );
      }

      // Recording opens on the beat *after* the last click, so the first note
      // the user plays is the downbeat rather than a pickup.
      countInTimersRef.current.push(
        setTimeout(
          () => {
            countInHoldsMicSessionRef.current = false;
            clearCountIn();
            begin();
          },
          (COUNT_IN_LEAD_SECONDS + COUNT_IN_BEATS * beatSeconds) * 1000,
        ),
      );
    },
    [clearCountIn],
  );

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

  /**
   * Permission prompt, audio session and recorder setup — everything that takes
   * an unpredictable amount of time. Kept separate from the actual start so a
   * count-in can run in between and still hand over on the beat.
   */
  const prepareMicRecording = useCallback(
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
      return true;
    },
    [audioRecorder, t],
  );

  const beginMicRecording = useCallback(() => {
    audioRecorder.record();
    startTimeRef.current = Date.now();
    setMode('microphone');
    setIsRecording(true);
  }, [audioRecorder]);

  const startMicRecording = useCallback(
    async (overdub: boolean) => {
      const ok = await prepareMicRecording(overdub);
      if (!ok) {
        return false;
      }
      beginMicRecording();
      return true;
    },
    [beginMicRecording, prepareMicRecording],
  );

  const finishSave = useCallback(
    async (currentMode: RecordingMode, durationMs: number): Promise<SavedRecording | null> => {
      const session = getStudioOverdubSession();
      const recordingId = `${Date.now()}`;

      if (currentMode === 'microphone') {
        const sourceUri = audioRecorder.uri;
        const take: SavedRecording = {
          id: recordingId,
          createdAt: Date.now(),
          instrument,
          mode: 'microphone',
          durationMs,
          audioUri: sourceUri ? persistRecordingAudio(recordingId, sourceUri) : undefined,
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
        const take = await finishSave(currentMode, durationMs);
        // Stopping used to leave nothing behind but the banner disappearing.
        // The studio path is exempt: it navigates to the project, so the take
        // lands somewhere the user can already see.
        if (take && !wasStudio) {
          setShowSavedToast(true);
        }
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

    // Second tap during the count-in backs out — otherwise a mistaken start
    // means sitting through a bar you no longer want.
    if (countInBeat !== null) {
      clearCountIn();
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
  }, [
    clearCountIn,
    countInBeat,
    countdown,
    isRecording,
    startStudioOverdub,
    stopRecording,
    studioArmed,
    studioSession,
  ]);

  const closeModePicker = useCallback(() => setShowModePicker(false), []);

  const hideSavedToast = useCallback(() => setShowSavedToast(false), []);

  const selectRecordingMode = useCallback(
    (key: string) => {
      setShowModePicker(false);

      if (key === 'instrument') {
        if (countInEnabledRef.current) {
          runCountIn(startInstrumentRecording);
        } else {
          startInstrumentRecording();
        }
        return;
      }

      void (async () => {
        // Prepared before the clicks, not after: the permission dialog and the
        // audio-session switch take an unknown amount of time, and doing them
        // last would drop an audible hole between the count-in and the take.
        const ok = await prepareMicRecording(false);
        if (!ok) {
          return;
        }
        if (!countInEnabledRef.current) {
          beginMicRecording();
          return;
        }
        runCountIn(beginMicRecording, true);
      })();
    },
    [beginMicRecording, prepareMicRecording, runCountIn, startInstrumentRecording],
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

  // Built here rather than in each screen so every instrument confirms a stop
  // the same way — the screens only decide where it sits in their tree.
  const recordSavedToast = createElement(Toast, {
    visible: showSavedToast,
    message: t('recording.savedTitle'),
    detail: t('recording.savedDetail'),
    onHide: hideSavedToast,
  });

  useEffect(() => {
    return () => {
      clearCountdown();
      clearCountIn();
      stopBeds();
    };
  }, [clearCountdown, clearCountIn, stopBeds]);

  return {
    isRecording,
    mode,
    handleRecordPress,
    captureEvent,
    studioArmed: !!studioArmed,
    studioProjectTitle: studioSession?.projectTitle ?? null,
    countdown,
    countInBeat,
    cancelStudioOverdub,
    recordModePicker,
    recordSavedToast,
  };
}
