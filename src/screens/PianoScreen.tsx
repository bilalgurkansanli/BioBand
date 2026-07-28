import { hapticNote } from '../utils/haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { StudioOverdubBanner } from '../components/studio/StudioOverdubBanner';
import { getMasterVolume, setMasterVolume } from '../audio/sampleBank';
import { setPianoToneOffset } from '../instruments/piano/pianoEngine';
import { PianoFxModal } from '../components/piano/PianoFxModal';
import { PianoKeyboard } from '../components/piano/PianoKeyboard';
import { PianoMetronomeModal } from '../components/piano/PianoMetronomeModal';
import { PianoNavigator } from '../components/piano/PianoNavigator';
import { PianoSettingsModal } from '../components/piano/PianoSettingsModal';
import { PianoToolbar } from '../components/piano/PianoToolbar';
import { PianoVoiceModal } from '../components/piano/PianoVoiceModal';
import { PianoVolumeModal } from '../components/piano/PianoVolumeModal';
import { PlayAlongHud } from '../components/piano/PlayAlongHud';
import { PlayAlongModal } from '../components/piano/PlayAlongModal';
import { PlaySpeedHud } from '../components/piano/PlaySpeedHud';
import { usePianoTone } from '../hooks/usePianoTone';
import { usePianoEngine } from '../hooks/usePianoEngine';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { useFreePlayPractice } from '../hooks/useFreePlayPractice';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoPlayAlong } from '../hooks/usePianoPlayAlong';
import { usePlaySpeed } from '../hooks/usePlaySpeed';
import { useUserSongs } from '../hooks/useUserSongs';
import type { NoteId } from '../instruments/piano/pianoNotes';
import {
  applyPianoFxSettings,
  getPianoFxSettings,
  isAnyPianoFxEnabled,
  type PianoFxSettings,
} from '../instruments/piano/pianoFx';
import {
  getMetronomeBpm,
  METRONOME_BPM_DEFAULT,
  startMetronome,
  stopMetronome,
} from '../instruments/piano/pianoMetronome';
import {
  getScaleNoteIds,
  snapToScale,
  type PianoScaleId,
} from '../instruments/piano/pianoScales';
import { buildChord } from '../instruments/piano/pianoChords';
import { resolveKeyboardTheme } from '../instruments/piano/pianoKeyThemes';
import { getPianoVoice, type PianoVoiceId } from '../instruments/piano/pianoVoices';
import {
  DEFAULT_PIANO_UI_SETTINGS,
  loadPianoUiSettings,
  savePianoUiSettings,
  type PianoChordMode,
  type PianoKeyThemeId,
  type PianoLabelMode,
  type PianoScaleLockMode,
  type PianoUiSettings,
} from '../storage/pianoSettingsStorage';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

const FX_APPLY_DEBOUNCE_MS = 80;

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Piano'>;

export function PianoScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tone = usePianoTone();
  const [voiceId, setVoiceId] = useState<PianoVoiceId>('acoustic');
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const { ready, error, playNote, noteOn, noteOff, setSustainPedal } = usePianoEngine(
    tone.semitoneOffset,
    voiceId,
  );
  const [keyboardSize, setKeyboardSize] = useState({ width: 0, height: 0 });
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [metronomeModalVisible, setMetronomeModalVisible] = useState(false);
  const [metronomeBpm, setMetronomeBpmState] = useState(
    () => getMetronomeBpm() || METRONOME_BPM_DEFAULT,
  );
  const [sustainOn, setSustainOn] = useState(false);
  const [showTonePanel, setShowTonePanel] = useState(
    DEFAULT_PIANO_UI_SETTINGS.showTonePanel,
  );
  const [showSpeedHud, setShowSpeedHud] = useState(
    DEFAULT_PIANO_UI_SETTINGS.showSpeedHud,
  );
  const [scaleId, setScaleId] = useState<PianoScaleId | null>(
    DEFAULT_PIANO_UI_SETTINGS.scaleId,
  );
  const [lastScaleId, setLastScaleId] = useState<PianoScaleId>('cMajor');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [labelMode, setLabelMode] = useState<PianoLabelMode>(
    DEFAULT_PIANO_UI_SETTINGS.labelMode,
  );
  const [keyTheme, setKeyTheme] = useState<PianoKeyThemeId>(
    DEFAULT_PIANO_UI_SETTINGS.keyTheme,
  );
  const [haptics, setHaptics] = useState<boolean>(
    DEFAULT_PIANO_UI_SETTINGS.haptics,
  );
  const [scaleLock, setScaleLock] = useState<PianoScaleLockMode>(
    DEFAULT_PIANO_UI_SETTINGS.scaleLock,
  );
  const [chordMode, setChordMode] = useState<PianoChordMode>(
    DEFAULT_PIANO_UI_SETTINGS.chordMode,
  );
  const { notesPerSec, recordNoteOn, maxNotesPerSec } = usePlaySpeed();

  const scaleNoteIds = useMemo(
    () => (scaleId ? getScaleNoteIds(scaleId) : null),
    [scaleId],
  );

  const [fxModalVisible, setFxModalVisible] = useState(false);
  const [fxSettings, setFxSettings] = useState<PianoFxSettings>(() =>
    getPianoFxSettings(),
  );
  const [volumeModalVisible, setVolumeModalVisible] = useState(false);
  const [volume, setVolume] = useState(() => getMasterVolume());
  const fxApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fxSettingsRef = useRef(fxSettings);
  fxSettingsRef.current = fxSettings;

  useEffect(() => {
    let cancelled = false;
    void loadPianoUiSettings().then((settings) => {
      if (cancelled) {
        return;
      }
      setShowTonePanel(settings.showTonePanel);
      setShowSpeedHud(settings.showSpeedHud);
      setScaleId(settings.scaleId);
      if (settings.scaleId) {
        setLastScaleId(settings.scaleId);
      }
      setVoiceId(settings.voiceId);
      fxSettingsRef.current = settings.fx;
      setFxSettings(settings.fx);
      applyPianoFxSettings(settings.fx);
      setVolume(settings.volume);
      setMasterVolume(settings.volume);
      tone.setTonePosition(settings.tonePosition);
      setLabelMode(settings.labelMode);
      setKeyTheme(settings.keyTheme);
      setHaptics(settings.haptics);
      setScaleLock(settings.scaleLock);
      setChordMode(settings.chordMode);
      setSettingsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
    // Hydration runs once, on mount. Listing `tone` here would re-read stored
    // settings and clobber the user's live tone slider every time the hook
    // returned a new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce persistence so scrubbing an FX slider does not hammer
  // AsyncStorage with dozens of writes. A pending change is flushed on unmount
  // (below) so the last tweak is never lost.
  const pendingSettingsRef = useRef<PianoUiSettings | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!settingsHydrated) {
      return;
    }
    const settings: PianoUiSettings = {
      showTonePanel,
      showSpeedHud,
      scaleId,
      voiceId,
      fx: fxSettings,
      volume,
      tonePosition: tone.tonePosition,
      labelMode,
      keyTheme,
      haptics,
      scaleLock,
      chordMode,
    };
    pendingSettingsRef.current = settings;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      pendingSettingsRef.current = null;
      void savePianoUiSettings(settings);
    }, 300);
  }, [
    settingsHydrated,
    showTonePanel,
    showSpeedHud,
    scaleId,
    voiceId,
    fxSettings,
    volume,
    tone.tonePosition,
    labelMode,
    keyTheme,
    haptics,
    scaleLock,
    chordMode,
  ]);

  // Flush any not-yet-written settings when leaving the screen.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (pendingSettingsRef.current) {
        void savePianoUiSettings(pendingSettingsRef.current);
        pendingSettingsRef.current = null;
      }
    };
  }, []);

  const handleScaleIdChange = useCallback((next: PianoScaleId | null) => {
    setScaleId(next);
    if (next) {
      setLastScaleId(next);
    }
  }, []);

  const voice = getPianoVoice(voiceId);
  const keyboardTheme = useMemo(
    () => resolveKeyboardTheme(voice.theme, keyTheme),
    [voice.theme, keyTheme],
  );

  const handleSelectVoice = useCallback((nextVoiceId: PianoVoiceId) => {
    setVoiceId(nextVoiceId);
    setVoiceModalVisible(false);
  }, []);

  const applyFxNow = useCallback((settings: PianoFxSettings) => {
    if (fxApplyTimerRef.current) {
      clearTimeout(fxApplyTimerRef.current);
      fxApplyTimerRef.current = null;
    }
    applyPianoFxSettings(settings);
  }, []);

  const handleFxSettingsChange = useCallback(
    (nextSettings: PianoFxSettings) => {
      const previousSettings = fxSettingsRef.current;
      const enabledStateChanged =
        previousSettings.distortion.enabled !== nextSettings.distortion.enabled ||
        previousSettings.reverb.enabled !== nextSettings.reverb.enabled ||
        previousSettings.echo.enabled !== nextSettings.echo.enabled;

      fxSettingsRef.current = nextSettings;
      setFxSettings(nextSettings);

      // Toggles must be immediate. In particular, Echo OFF must cancel every
      // pending delayed repeat before the next piano key can be pressed.
      if (enabledStateChanged) {
        applyFxNow(nextSettings);
      }
    },
    [applyFxNow],
  );

  // Debounce slider scrubbing so we do not rebuild/ramp every frame.
  useEffect(() => {
    if (fxApplyTimerRef.current) {
      clearTimeout(fxApplyTimerRef.current);
    }
    fxApplyTimerRef.current = setTimeout(() => {
      applyPianoFxSettings(fxSettings);
      fxApplyTimerRef.current = null;
    }, FX_APPLY_DEBOUNCE_MS);

    return () => {
      if (fxApplyTimerRef.current) {
        clearTimeout(fxApplyTimerRef.current);
        fxApplyTimerRef.current = null;
      }
    };
  }, [fxSettings]);

  // After engine re-init (leave/return), restore UI FX state onto the fresh bus.
  useEffect(() => {
    if (ready) {
      applyFxNow(fxSettingsRef.current);
    }
  }, [ready, applyFxNow]);

  useEffect(() => {
    return () => {
      stopMetronome();
    };
  }, []);

  // Leaving the tab releases the engine, which stops the metronome and drops
  // the sustain pedal — but this screen stays mounted, so its toolbar kept
  // showing both as ON over an engine that had turned them off. Coming back
  // re-reads reality instead of trusting the surviving state.
  useFocusEffect(
    useCallback(() => {
      setMetronomeOn(false);
      setMetronomeModalVisible(false);
      setSustainOn(false);
    }, []),
  );

  const handleOpenFx = useCallback(() => {
    applyFxNow(fxSettingsRef.current);
    setFxModalVisible(true);
  }, [applyFxNow]);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    setVolume(nextVolume);
    setMasterVolume(nextVolume);
  }, []);


  const handleMetronomePress = useCallback(() => {
    if (metronomeOn) {
      stopMetronome();
      setMetronomeOn(false);
      return;
    }

    startMetronome(metronomeBpm);
    setMetronomeOn(true);
    setMetronomeModalVisible(true);
  }, [metronomeOn, metronomeBpm]);

  const handleMetronomeBpmChange = useCallback((bpm: number) => {
    setMetronomeBpmState(bpm);
  }, []);

  const handleSustainPress = useCallback(() => {
    setSustainOn((current) => {
      const next = !current;
      setSustainPedal(next);
      return next;
    });
  }, [setSustainPedal]);

  const userSongs = useUserSongs();
  const playAlong = usePianoPlayAlong(
    playNote,
    userSongs.songs,
    (songId, eventsStartMs) => {
      void userSongs.updateUserSongBackingOffset(songId, eventsStartMs);
    },
  );

  // Play-along lights chart NoteIds — keep sounding pitch in concert pitch.
  useEffect(() => {
    setPianoToneOffset(playAlong.isActive ? 0 : tone.semitoneOffset);
  }, [playAlong.isActive, tone.semitoneOffset]);

  const {
    isRecording,
    mode,
    handleRecordPress,
    captureEvent,
    studioArmed,
    studioProjectTitle,
    countdown,
    countInBeat,
    cancelStudioOverdub,
    recordModePicker,
    recordSavedToast,
  } = useInstrumentRecording('piano');

  const { isPortrait } = usePianoOrientation(navigation);

  const { notePlayed } = useFreePlayPractice('piano');

  const handleKeyboardLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setKeyboardSize({ width, height });
  };

  // Remembers which notes each pressed key actually sounded (chord expansion /
  // scale snap), so the matching keys are released on lift.
  const activePressRef = useRef<Map<NoteId, NoteId[]>>(new Map());
  // Chord mode can expand two different pressed keys into overlapping sounded
  // notes (e.g. two chords that share a third). Tracks, per sounded note,
  // which pressed keys are currently holding it — a note only actually stops
  // when its last holder key releases, not the first.
  const soundedNoteHoldersRef = useRef<Map<NoteId, Set<NoteId>>>(new Map());

  // Resolve a pressed key into the notes that should sound, applying scale
  // lock first (mute or snap out-of-scale keys) then chord expansion.
  const resolveSoundedNotes = useCallback(
    (pressed: NoteId): NoteId[] => {
      let base = pressed;
      if (
        scaleId &&
        scaleLock !== 'off' &&
        scaleNoteIds &&
        !scaleNoteIds.has(pressed)
      ) {
        if (scaleLock === 'mute') {
          return [];
        }
        base = snapToScale(pressed, scaleId);
      }
      return buildChord(base, chordMode, scaleId);
    },
    [scaleId, scaleLock, scaleNoteIds, chordMode],
  );

  // Depend on the two fields the key handlers actually read, not on the whole
  // play-along object — that changes identity on every progress tick, and the
  // keyboard would redraw with it.
  const playAlongIsActive = playAlong.isActive;
  const playAlongHandleNotePress = playAlong.handleNotePress;

  const onNotePressIn = useCallback(
    (noteId: NoteId) => {
      notePlayed();
      if (haptics) {
        hapticNote();
      }

      if (playAlongIsActive) {
        captureEvent(noteId);
        playAlongHandleNotePress(noteId);
        return;
      }

      const sounded = resolveSoundedNotes(noteId);
      activePressRef.current.set(noteId, sounded);
      if (sounded.length === 0) {
        return;
      }

      recordNoteOn();
      for (const id of sounded) {
        let holders = soundedNoteHoldersRef.current.get(id);
        if (!holders) {
          holders = new Set();
          soundedNoteHoldersRef.current.set(id, holders);
        }
        holders.add(noteId);
        captureEvent(id);
        // Always retrigger — same as pressing an already-ringing key again
        // on a real piano. Only release (below) is gated by other holders.
        noteOn(id);
      }
    },
    [
      captureEvent,
      haptics,
      noteOn,
      notePlayed,
      playAlongHandleNotePress,
      playAlongIsActive,
      recordNoteOn,
      resolveSoundedNotes,
    ],
  );

  const onNotePressOut = useCallback(
    (noteId: NoteId) => {
      if (playAlongIsActive) {
        return;
      }
      const sounded = activePressRef.current.get(noteId);
      activePressRef.current.delete(noteId);
      for (const id of sounded ?? [noteId]) {
        const holders = soundedNoteHoldersRef.current.get(id);
        holders?.delete(noteId);
        if (holders && holders.size > 0) {
          // Another still-held key's chord also sounds this note — keep it
          // ringing.
          continue;
        }
        soundedNoteHoldersRef.current.delete(id);
        noteOff(id);
      }
    },
    [noteOff, playAlongIsActive],
  );

  const handleSettingsPress = useCallback(() => {
    setSettingsModalVisible(true);
  }, []);

  const playAlongOpen = playAlong.open;

  const handleStartTutorialFromSettings = useCallback(() => {
    playAlongOpen();
  }, [playAlongOpen]);

  const handleGamePress = useCallback(() => {
    playAlongOpen();
  }, [playAlongOpen]);

  const isPlayAlongModalVisible =
    playAlong.phase === 'pickSong' ||
    playAlong.phase === 'pickScope' ||
    playAlong.phase === 'pickMode' ||
    playAlong.phase === 'pickAudio' ||
    playAlong.phase === 'calibrateOffset' ||
    playAlong.phase === 'pickLevel' ||
    playAlong.phase === 'results';

  const hideSpeedHud =
    playAlong.phase === 'countdown' ||
    playAlong.phase === 'demo' ||
    playAlong.phase === 'playing';

  return (
    <View
      pointerEvents={isPortrait ? 'none' : 'auto'}
      style={[
        styles.container,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <PianoToolbar
        fxOn={isAnyPianoFxEnabled(fxSettings)}
        instrumentAccent={voice.theme.accent}
        isRecording={isRecording}
        metronomeOn={metronomeOn}
        onBack={() => navigation.goBack()}
        onFxPress={handleOpenFx}
        onGamePress={handleGamePress}
        onInstrumentPress={() => setVoiceModalVisible(true)}
        onMetronomeLongPress={() => {
          if (metronomeOn) {
            setMetronomeModalVisible(true);
          }
        }}
        onMetronomePress={handleMetronomePress}
        onRecordPress={handleRecordPress}
        onSettingsPress={handleSettingsPress}
        onSustainPress={handleSustainPress}
        onVolumePress={() => setVolumeModalVisible(true)}
        sustainOn={sustainOn}
        volume={volume}
      />

      {showTonePanel ? (
        <PianoNavigator
          canStepThicker={tone.canStepThicker}
          canStepThinner={tone.canStepThinner}
          onJumpCenter={tone.jumpCenter}
          onJumpHigh={tone.jumpHigh}
          onJumpLow={tone.jumpLow}
          onStepThicker={tone.stepThicker}
          onStepThinner={tone.stepThinner}
          onToneChange={tone.setTonePosition}
          semitoneOffset={tone.semitoneOffset}
          tonePosition={tone.tonePosition}
        />
      ) : null}

      {showSpeedHud ? (
        <PlaySpeedHud
          maxNotesPerSec={maxNotesPerSec}
          notesPerSec={notesPerSec}
          visible={!hideSpeedHud}
        />
      ) : null}

      {studioArmed && studioProjectTitle ? (
        <StudioOverdubBanner
          countdown={countdown}
          projectTitle={studioProjectTitle}
          onCancel={cancelStudioOverdub}
        />
      ) : (
        <RecordingBanner
          countInBeat={countInBeat}
          isRecording={isRecording}
          mode={mode}
        />
      )}

      {recordModePicker}
      {recordSavedToast}

      <PlayAlongHud
        countdownValue={playAlong.countdownValue}
        isListeningOutro={playAlong.isListeningOutro}
        level={playAlong.level}
        onStop={playAlong.close}
        phase={playAlong.phase}
        playMode={playAlong.playMode}
        progress={playAlong.progress}
        songTitle={playAlong.selectedSong?.title}
      />

      <View style={styles.keyboardArea} onLayout={handleKeyboardLayout}>
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>
              {error ? t('instruments.pianoLoadError') : t('instruments.pianoLoading')}
            </Text>
          </View>
        ) : keyboardSize.width > 0 && keyboardSize.height > 0 ? (
          <PianoKeyboard
            guideNoteId={playAlong.guideNoteId}
            height={keyboardSize.height}
            labelMode={labelMode}
            onNotePressIn={onNotePressIn}
            onNotePressOut={onNotePressOut}
            scaleNoteIds={scaleNoteIds}
            theme={keyboardTheme}
            width={keyboardSize.width}
          />
        ) : null}
      </View>

      <PlayAlongModal
        audioBusy={playAlong.audioBusy}
        calibrateOffsetMs={playAlong.calibrateOffsetMs}
        calibratePreviewing={playAlong.calibratePreviewing}
        demoJustFinished={playAlong.demoJustFinished}
        importing={userSongs.importing}
        offsetMaxMs={playAlong.offsetMaxMs}
        offsetMinMs={playAlong.offsetMinMs}
        onBackToSongList={playAlong.backToSongList}
        onClose={playAlong.close}
        onConfirmCalibrate={() => {
          void playAlong.confirmCalibrate();
        }}
        onDeleteUserSong={(songId) => {
          void userSongs.removeSong(songId);
        }}
        onGoBack={playAlong.goBack}
        onImportSong={userSongs.importSong}
        onImportSongFromJsonText={userSongs.importSongFromJsonText}
        onPickBackingAudio={async (uri, hint) => {
          const result = await playAlong.pickBackingAudio(uri, hint);
          return { ok: result.ok };
        }}
        onPreviewCalibrate={() => {
          void playAlong.previewCalibrate();
        }}
        onReplay={playAlong.replay}
        onSelectLevel={playAlong.selectLevel}
        onSelectPlayMode={playAlong.selectPlayMode}
        onSelectScope={playAlong.selectScope}
        onSelectSong={(songId) => {
          void playAlong.selectSong(songId);
        }}
        onSelectTempo={playAlong.setTempo}
        onSetCalibrateOffset={playAlong.setCalibrateOffset}
        onStopCalibratePreview={playAlong.stopCalibratePreview}
        phase={playAlong.phase}
        results={playAlong.results}
        selectedSong={playAlong.selectedSong}
        tempo={playAlong.tempo}
        userSongs={userSongs.songs}
        visible={isPlayAlongModalVisible && !isPortrait}
      />

      <PianoVoiceModal
        onClose={() => setVoiceModalVisible(false)}
        onSelect={handleSelectVoice}
        selectedVoiceId={voiceId}
        visible={voiceModalVisible && !isPortrait}
      />

      <PianoFxModal
        onChange={handleFxSettingsChange}
        onClose={() => setFxModalVisible(false)}
        settings={fxSettings}
        visible={fxModalVisible && !isPortrait}
      />

      <PianoVolumeModal
        onChange={handleVolumeChange}
        onClose={() => setVolumeModalVisible(false)}
        visible={volumeModalVisible && !isPortrait}
        volume={volume}
      />

      <PianoMetronomeModal
        bpm={metronomeBpm}
        onChangeBpm={handleMetronomeBpmChange}
        onClose={() => setMetronomeModalVisible(false)}
        showSubdivision
        visible={metronomeModalVisible && !isPortrait}
      />

      <PianoSettingsModal
        chordMode={chordMode}
        haptics={haptics}
        keyTheme={keyTheme}
        labelMode={labelMode}
        lastScaleId={lastScaleId}
        onChangeChordMode={setChordMode}
        onChangeHaptics={setHaptics}
        onChangeKeyTheme={setKeyTheme}
        onChangeLabelMode={setLabelMode}
        onChangeScaleId={handleScaleIdChange}
        onChangeScaleLock={setScaleLock}
        onChangeShowSpeedHud={setShowSpeedHud}
        onChangeShowTonePanel={setShowTonePanel}
        onClose={() => setSettingsModalVisible(false)}
        onStartTutorial={handleStartTutorialFromSettings}
        scaleId={scaleId}
        scaleLock={scaleLock}
        showSpeedHud={showSpeedHud}
        showTonePanel={showTonePanel}
        visible={settingsModalVisible && !isPortrait}
      />

      <LandscapeOverlay
        hintKey="instruments.pianoLandscapeHint"
        titleKey="instruments.pianoLandscapeRequired"
        visible={isPortrait}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  keyboardArea: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
