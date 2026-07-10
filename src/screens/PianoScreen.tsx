import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { getMasterVolume, setMasterVolume } from '../audio/sampleBank';
import { PianoFxModal } from '../components/piano/PianoFxModal';
import { PianoKeyboard } from '../components/piano/PianoKeyboard';
import { PianoMetronomeModal } from '../components/piano/PianoMetronomeModal';
import { PianoNavigator } from '../components/piano/PianoNavigator';
import { PianoSettingsModal } from '../components/piano/PianoSettingsModal';
import { PianoToolbar } from '../components/piano/PianoToolbar';
import { PianoTutorialModal } from '../components/piano/PianoTutorialModal';
import { PianoVoiceModal } from '../components/piano/PianoVoiceModal';
import { PianoVolumeModal } from '../components/piano/PianoVolumeModal';
import { PlayAlongHud } from '../components/piano/PlayAlongHud';
import { PlayAlongModal } from '../components/piano/PlayAlongModal';
import { PlaySpeedHud } from '../components/piano/PlaySpeedHud';
import { TutorialBanner } from '../components/piano/TutorialBanner';
import { usePianoTone } from '../hooks/usePianoTone';
import { usePianoEngine } from '../hooks/usePianoEngine';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoPlayAlong } from '../hooks/usePianoPlayAlong';
import { usePianoTutorial } from '../hooks/usePianoTutorial';
import { usePlaySpeed } from '../hooks/usePlaySpeed';
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
  type PianoScaleId,
} from '../instruments/piano/pianoScales';
import { getPianoVoice, type PianoVoiceId } from '../instruments/piano/pianoVoices';
import {
  DEFAULT_PIANO_UI_SETTINGS,
  loadPianoUiSettings,
  savePianoUiSettings,
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
  const { notesPerSec, recordNoteOn, maxNotesPerSec } = usePlaySpeed();

  const scaleNoteIds = useMemo(
    () => (scaleId ? getScaleNoteIds(scaleId) : null),
    [scaleId],
  );

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
      setSettingsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsHydrated) {
      return;
    }
    void savePianoUiSettings({
      showTonePanel,
      showSpeedHud,
      scaleId,
    });
  }, [settingsHydrated, showTonePanel, showSpeedHud, scaleId]);

  const handleScaleIdChange = useCallback((next: PianoScaleId | null) => {
    setScaleId(next);
    if (next) {
      setLastScaleId(next);
    }
  }, []);

  const voice = getPianoVoice(voiceId);

  const handleSelectVoice = useCallback((nextVoiceId: PianoVoiceId) => {
    setVoiceId(nextVoiceId);
    setVoiceModalVisible(false);
  }, []);

  const [fxModalVisible, setFxModalVisible] = useState(false);
  const [fxSettings, setFxSettings] = useState<PianoFxSettings>(() =>
    getPianoFxSettings(),
  );
  const [volumeModalVisible, setVolumeModalVisible] = useState(false);
  const [volume, setVolume] = useState(() => getMasterVolume());
  const fxApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fxSettingsRef = useRef(fxSettings);
  fxSettingsRef.current = fxSettings;

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

  const {
    songs,
    phase,
    selectedSong,
    demoNoteId,
    guideNoteId,
    openTutorial,
    closeTutorial,
    selectSong,
    backToSongList,
    startWatch,
    handleNotePress,
  } = usePianoTutorial(playNote);

  const playAlong = usePianoPlayAlong(playNote);

  const { isRecording, mode, handleRecordPress, captureEvent } =
    useInstrumentRecording('piano');

  const { isPortrait } = usePianoOrientation(navigation);

  const handleKeyboardLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setKeyboardSize({ width, height });
  };

  const onNotePressIn = useCallback(
    (noteId: NoteId) => {
      captureEvent(noteId);

      if (playAlong.isActive) {
        playAlong.handleNotePress(noteId);
        return;
      }

      // Tutorial practice/watch use one-shot playNote — not interactive hold.
      if (phase === 'practice' || phase === 'watching') {
        handleNotePress(noteId);
        return;
      }

      recordNoteOn();
      noteOn(noteId);
    },
    [captureEvent, handleNotePress, noteOn, phase, playAlong, recordNoteOn],
  );

  const onNotePressOut = useCallback(
    (noteId: NoteId) => {
      if (playAlong.isActive || phase === 'practice' || phase === 'watching') {
        return;
      }
      noteOff(noteId);
    },
    [noteOff, phase, playAlong.isActive],
  );

  const handleSettingsPress = useCallback(() => {
    setSettingsModalVisible(true);
  }, []);

  const handleStartTutorialFromSettings = useCallback(() => {
    playAlong.close();
    openTutorial();
  }, [openTutorial, playAlong]);

  const handleGamePress = useCallback(() => {
    closeTutorial();
    playAlong.open();
  }, [closeTutorial, playAlong]);

  const isModalVisible = phase === 'pickSong' || phase === 'readyToWatch';
  const isPlayAlongModalVisible =
    playAlong.phase === 'pickSong' ||
    playAlong.phase === 'pickLevel' ||
    playAlong.phase === 'results';

  const hideSpeedHud =
    phase === 'watching' ||
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

      <RecordingBanner isRecording={isRecording} mode={mode} />

      <TutorialBanner phase={phase} songTitle={selectedSong?.title} />

      <PlayAlongHud
        countdownValue={playAlong.countdownValue}
        level={playAlong.level}
        onStop={playAlong.close}
        phase={playAlong.phase}
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
            demoNoteId={demoNoteId}
            guideNoteId={playAlong.guideNoteId ?? guideNoteId}
            height={keyboardSize.height}
            onNotePressIn={onNotePressIn}
            onNotePressOut={onNotePressOut}
            scaleNoteIds={scaleNoteIds}
            theme={voice.theme}
            width={keyboardSize.width}
          />
        ) : null}
      </View>

      <PianoTutorialModal
        onBackToSongList={backToSongList}
        onClose={closeTutorial}
        onSelectSong={selectSong}
        onStartWatch={startWatch}
        phase={phase}
        selectedSong={selectedSong}
        songs={songs}
        visible={isModalVisible && !isPortrait}
      />

      <PlayAlongModal
        onBackToSongList={playAlong.backToSongList}
        onClose={playAlong.close}
        onReplay={playAlong.replay}
        onSelectLevel={playAlong.selectLevel}
        onSelectSong={playAlong.selectSong}
        phase={playAlong.phase}
        results={playAlong.results}
        selectedSong={playAlong.selectedSong}
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
        visible={metronomeModalVisible && !isPortrait}
      />

      <PianoSettingsModal
        lastScaleId={lastScaleId}
        onChangeScaleId={handleScaleIdChange}
        onChangeShowSpeedHud={setShowSpeedHud}
        onChangeShowTonePanel={setShowTonePanel}
        onClose={() => setSettingsModalVisible(false)}
        onStartTutorial={handleStartTutorialFromSettings}
        scaleId={scaleId}
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
