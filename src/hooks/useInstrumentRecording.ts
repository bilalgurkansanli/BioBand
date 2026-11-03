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
  prepareStudioPlayback,
  stopStudioPlayback,
  type PreparedStudioPlayback,
  type StudioPlaybackHandle,
} from '../audio/studioPlayer';
import { getCurrentDrumKitId } from '../instruments/drums/drumsEngine';
import { getCurrentGuitarVoiceId } from '../instruments/guitar/guitarEngine';
import { getCurrentPadBankId } from '../instruments/pads/padsEngine';
import { getPianoToneOffset, getPianoVoice } from '../instruments/piano/pianoEngine';
import { getCurrentViolinVoiceId } from '../instruments/violin/violinEngine';
import { awardRecordingPractice } from '../profile/awardPlayAlong';
import { persistRecordingAudio } from '../storage/recordingAudioStorage';
import { saveRecording } from '../storage/recordingsStorage';
import {
  appendRecordedTrack,
  getStudioProject,
  updateStudioTrack,
} from '../storage/studioProjectsStorage';
import { captureOffsetMs } from '../studio/overdubTiming';
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
  /** How far after the overdub's beds the mic capture began (see overdubTiming). */
  const takeOffsetMsRef = useRef(0);
  /** False once the screen is gone — an overdub still preparing must not start. */
  const mountedRef = useRef(true);
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
      try {
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
      } catch (error) {
        // A recorder that will not prepare used to fail silently inside a
        // fire-and-forget promise: the button simply did nothing.
        console.warn('Recording: could not prepare the microphone', error);
        Alert.alert(t('recording.startError'));
        void restorePlaybackAudioMode();
        return false;
      }
    },
    [audioRecorder, t],
  );

  /**
   * Starts the prepared recorder. With `bedsStartContextTime` (an overdub),
   * also measures how long after the beds' start the capture actually began,
   * so the take can be placed exactly that far in on the project timeline.
   */
  const beginMicRecording = useCallback(
    (bedsStartContextTime?: number): boolean => {
      try {
        audioRecorder.record();
      } catch (error) {
        // Thrown from a count-in timer this would be an uncaught exception.
        console.warn('Recording: the microphone would not start', error);
        Alert.alert(t('recording.startError'));
        void restorePlaybackAudioMode();
        return false;
      }
      startTimeRef.current = Date.now();
      takeOffsetMsRef.current =
        bedsStartContextTime === undefined
          ? 0
          : captureOffsetMs(
              bedsStartContextTime,
              getSharedAudioContext().currentTime,
              audioRecorder.currentTime,
            );
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
          const project = await appendRecordedTrack(session.projectId, take);
          // The capture began this long after the beds did (measured when the
          // recorder started): place the take that far in, so it lines up
          // with what the user was hearing instead of sitting early.
          const offsetMs = takeOffsetMsRef.current;
          const track = project?.tracks.find((entry) => entry.sourceTakeId === take.id);
          if (track && offsetMs > 0) {
            await updateStudioTrack(session.projectId, track.id, { startMs: offsetMs });
          }
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
          // The engine's voice is the one the screen plays with — playback no
          // longer re-voices it, so it is safe to read even during an overdub.
          pianoVoiceId: instrument === 'piano' ? getPianoVoice() : undefined,
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

  /**
   * Overdub start. Everything slow — the permission prompt, the audio-session
   * switch, preparing the recorder, loading the beds' engines — happens
   * first; then the beds and the recorder start back to back in one tick.
   * Starting the beds first and preparing the mic afterwards (the old order)
   * left the take hundreds of milliseconds late against them, switched the
   * audio mode twice while they played, and placed the take at 0 anyway.
   */
  const beginStudioCapture = useCallback(async () => {
    const session = getStudioOverdubSession();
    if (!session || session.instrument !== instrument) {
      return;
    }
    const isMic = session.mode === 'microphone';
    // The cancel button stays live through the awaits below, and the user can
    // leave the screen.
    const stillArmed = () => mountedRef.current && getStudioOverdubSession() === session;

    if (isMic) {
      const ok = await prepareMicRecording(true);
      if (!ok || !stillArmed()) {
        if (ok) {
          void restorePlaybackAudioMode();
        }
        return;
      }
    }

    let beds: PreparedStudioPlayback | null = null;
    try {
      const project = await getStudioProject(session.projectId);
      if (project && project.tracks.length > 0) {
        // The mic's recording session already plays audio; switching back to
        // plain playback would take the microphone away from the recorder.
        beds = await prepareStudioPlayback(project, { restoreAudioMode: !isMic });
      }
    } catch (error) {
      console.warn('Overdub: the backing tracks could not be prepared', error);
      Alert.alert(t('studio.playbackError'));
      if (isMic) {
        void restorePlaybackAudioMode();
      }
      return;
    }
    if (!stillArmed()) {
      if (isMic) {
        void restorePlaybackAudioMode();
      }
      return;
    }

    // Back to back from here — nothing slow between the beds and the take.
    const handle = beds?.start() ?? null;
    bedsHandleRef.current = handle;

    if (isMic) {
      if (!beginMicRecording(handle?.startContextTime)) {
        stopBeds();
      }
      return;
    }
    // An instrument take is timed from this moment, which is the beds' start.
    startInstrumentRecording();
  }, [
    beginMicRecording,
    instrument,
    prepareMicRecording,
    startInstrumentRecording,
    stopBeds,
    t,
  ]);

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
        // The piano records written keys; the tone slider decides the pitch
        // they sound at. Read from the engine at the moment of the note, so a
        // slider move mid-take is kept and no screen has to pass it in.
        ...(instrument === 'piano' ? { transposeSemitones: getPianoToneOffset() } : {}),
      });
    },
    [instrument, isRecording, mode],
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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
