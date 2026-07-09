import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { getMasterVolume, setMasterVolume } from '../audio/sampleBank';
import { PianoFxModal } from '../components/piano/PianoFxModal';
import { PianoKeyboard } from '../components/piano/PianoKeyboard';
import { PianoNavigator } from '../components/piano/PianoNavigator';
import { PianoToolbar } from '../components/piano/PianoToolbar';
import { PianoTutorialModal } from '../components/piano/PianoTutorialModal';
import { PianoVoiceModal } from '../components/piano/PianoVoiceModal';
import { PianoVolumeModal } from '../components/piano/PianoVolumeModal';
import { PlayAlongHud } from '../components/piano/PlayAlongHud';
import { PlayAlongModal } from '../components/piano/PlayAlongModal';
import { TutorialBanner } from '../components/piano/TutorialBanner';
import { usePianoTone } from '../hooks/usePianoTone';
import { usePianoEngine } from '../hooks/usePianoEngine';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoPlayAlong } from '../hooks/usePianoPlayAlong';
import { usePianoTutorial } from '../hooks/usePianoTutorial';
import type { NoteId } from '../instruments/piano/pianoNotes';
import {
  applyPianoFxSettings,
  getPianoFxSettings,
  isAnyPianoFxEnabled,
  type PianoFxSettings,
} from '../instruments/piano/pianoFx';
import { getPianoVoice, type PianoVoiceId } from '../instruments/piano/pianoVoices';
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
  const { ready, error, playNote } = usePianoEngine(tone.semitoneOffset, voiceId);
  const [keyboardSize, setKeyboardSize] = useState({ width: 0, height: 0 });
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [sustainOn, setSustainOn] = useState(false);

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

  const handleOpenFx = useCallback(() => {
    applyFxNow(fxSettingsRef.current);
    setFxModalVisible(true);
  }, [applyFxNow]);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    setVolume(nextVolume);
    setMasterVolume(nextVolume);
  }, []);

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

  const onNotePress = useCallback(
    (noteId: NoteId) => {
      captureEvent(noteId);

      if (playAlong.isActive) {
        playAlong.handleNotePress(noteId);
        return;
      }

      handleNotePress(noteId);
    },
    [captureEvent, handleNotePress, playAlong],
  );

  const showComingSoon = useCallback(
    (featureKey: string) => {
      Alert.alert(t('piano.comingSoonTitle'), t(featureKey));
    },
    [t],
  );

  const handleMenuPress = useCallback(() => {
    Alert.alert(t('piano.toolbar.menu'), undefined, [
      {
        text: t('tutorial.start'),
        onPress: () => {
          playAlong.close();
          openTutorial();
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [openTutorial, playAlong, t]);

  const handleGamePress = useCallback(() => {
    closeTutorial();
    playAlong.open();
  }, [closeTutorial, playAlong]);

  const isModalVisible = phase === 'pickSong' || phase === 'readyToWatch';
  const isPlayAlongModalVisible =
    playAlong.phase === 'pickSong' ||
    playAlong.phase === 'pickLevel' ||
    playAlong.phase === 'results';

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
        isRecording={isRecording}
        metronomeOn={metronomeOn}
        onBack={() => navigation.goBack()}
        onDualKeyboardPress={() => showComingSoon('piano.toolbar.dualKeyboardComingSoon')}
        onFxPress={handleOpenFx}
        fxOn={isAnyPianoFxEnabled(fxSettings)}
        instrumentAccent={voice.theme.accent}
        onGamePress={handleGamePress}
        onInstrumentPress={() => setVoiceModalVisible(true)}
        onLayoutPress={() => showComingSoon('piano.toolbar.layoutComingSoon')}
        onMenuPress={handleMenuPress}
        onMetronomePress={() => setMetronomeOn((current) => !current)}
        onRecordPress={handleRecordPress}
        onSustainPress={() => setSustainOn((current) => !current)}
        onVolumePress={() => setVolumeModalVisible(true)}
        sustainOn={sustainOn}
        volume={volume}
      />

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
            onNotePressIn={onNotePress}
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
