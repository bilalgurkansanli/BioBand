import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { hapticNote } from '../utils/haptics';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMasterVolume, setMasterVolume } from '../audio/sampleBank';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { StudioOverdubBanner } from '../components/studio/StudioOverdubBanner';
import { PianoFxModal } from '../components/piano/PianoFxModal';
import { PianoMetronomeModal } from '../components/piano/PianoMetronomeModal';
import { PianoVolumeModal } from '../components/piano/PianoVolumeModal';
import { ViolinFingerboard } from '../components/violin/ViolinFingerboard';
import { ViolinPlayAlongHud } from '../components/violin/ViolinPlayAlongHud';
import { ViolinPlayAlongModal } from '../components/violin/ViolinPlayAlongModal';
import { ViolinSettingsModal } from '../components/violin/ViolinSettingsModal';
import { ViolinToolbar } from '../components/violin/ViolinToolbar';
import { ViolinVoiceModal } from '../components/violin/ViolinVoiceModal';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { useFreePlayPractice } from '../hooks/useFreePlayPractice';
import { useUserViolinSongs } from '../hooks/useUserViolinSongs';
import { useViolinEngine } from '../hooks/useViolinEngine';
import { useViolinPlayAlong } from '../hooks/useViolinPlayAlong';
import {
  formatNoteSoundId,
  type ViolinStringId,
} from '../instruments/violin/violinSounds';
import { getViolinVoice, type ViolinVoiceId } from '../instruments/violin/violinVoices';
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
  DEFAULT_VIOLIN_UI_SETTINGS,
  loadViolinUiSettings,
  saveViolinUiSettings,
} from '../storage/violinSettingsStorage';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

const FX_APPLY_DEBOUNCE_MS = 80;

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Violin'>;

export function ViolinScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [voiceId, setVoiceId] = useState<ViolinVoiceId>('classic');
  const voice = getViolinVoice(voiceId);
  const { ready, error, playNote, playSoundId } = useViolinEngine(voiceId);

  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [metronomeModalVisible, setMetronomeModalVisible] = useState(false);
  const [metronomeBpm, setMetronomeBpmState] = useState(
    () => getMetronomeBpm() || METRONOME_BPM_DEFAULT,
  );

  const [fxModalVisible, setFxModalVisible] = useState(false);
  const [fxSettings, setFxSettings] = useState<PianoFxSettings>(() => getPianoFxSettings());
  const fxApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fxSettingsRef = useRef(fxSettings);
  fxSettingsRef.current = fxSettings;

  const [volumeModalVisible, setVolumeModalVisible] = useState(false);
  const [volume, setVolume] = useState(() => getMasterVolume());

  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [noteLabelMode, setNoteLabelMode] = useState(
    DEFAULT_VIOLIN_UI_SETTINGS.noteLabelMode,
  );
  const [strongGuideHighlight, setStrongGuideHighlight] = useState(
    DEFAULT_VIOLIN_UI_SETTINGS.strongGuideHighlight,
  );
  const [haptics, setHaptics] = useState(DEFAULT_VIOLIN_UI_SETTINGS.haptics);

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
  } = useInstrumentRecording('violin');
  const { isPortrait } = usePianoOrientation(navigation);
  const { notePlayed } = useFreePlayPractice('violin');
  const userSongs = useUserViolinSongs();
  const playAlong = useViolinPlayAlong(playSoundId, userSongs.songs);

  useEffect(() => {
    let cancelled = false;
    void loadViolinUiSettings().then((settings) => {
      if (cancelled) {
        return;
      }
      setNoteLabelMode(settings.noteLabelMode);
      setStrongGuideHighlight(settings.strongGuideHighlight);
      setHaptics(settings.haptics);
      setVoiceId(settings.voiceId);
      fxSettingsRef.current = settings.fx;
      setFxSettings(settings.fx);
      applyPianoFxSettings(settings.fx);
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
    void saveViolinUiSettings({
      noteLabelMode,
      strongGuideHighlight,
      haptics,
      voiceId,
      fx: fxSettings,
    });
  }, [
    settingsHydrated,
    noteLabelMode,
    strongGuideHighlight,
    haptics,
    voiceId,
    fxSettings,
  ]);

  // Blur (tab switch) releases the engine, which stops the metronome — keep
  // the toolbar state in sync so the button is not left looking active.
  useFocusEffect(
    useCallback(() => {
      return () => {
        stopMetronome();
        setMetronomeOn(false);
      };
    }, []),
  );

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

      if (enabledStateChanged) {
        applyFxNow(nextSettings);
      }
    },
    [applyFxNow],
  );

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

  const buzz = useCallback(() => {
    notePlayed();
    if (haptics) {
      hapticNote();
    }
  }, [haptics, notePlayed]);

  const onPlayNote = useCallback(
    (stringId: ViolinStringId, position: number) => {
      const soundId = formatNoteSoundId(stringId, position);
      captureEvent(soundId);

      if (playAlong.isActive) {
        if (playAlong.phase === 'demo') {
          return;
        }
        buzz();
        playNote(stringId, position);
        playAlong.handleSoundPress(soundId, { skipPlayback: true });
        return;
      }

      buzz();
      playNote(stringId, position);
    },
    [buzz, captureEvent, playAlong, playNote],
  );

  const isPlayAlongModalVisible =
    playAlong.phase === 'pickSong' ||
    playAlong.phase === 'pickScope' ||
    playAlong.phase === 'pickMode' ||
    playAlong.phase === 'pickAudio' ||
    playAlong.phase === 'calibrateOffset' ||
    playAlong.phase === 'pickLevel' ||
    playAlong.phase === 'results';

  return (
    <View
      pointerEvents={isPortrait ? 'none' : 'auto'}
      style={[
        styles.container,
        {
          backgroundColor: voice.theme.stageBg,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ViolinToolbar
        fxOn={isAnyPianoFxEnabled(fxSettings)}
        isRecording={isRecording}
        metronomeOn={metronomeOn}
        onBack={() => navigation.goBack()}
        onFxPress={handleOpenFx}
        onGamePress={playAlong.open}
        onMetronomeLongPress={() => {
          if (metronomeOn) {
            setMetronomeModalVisible(true);
          }
        }}
        onMetronomePress={handleMetronomePress}
        onRecordPress={handleRecordPress}
        onSettingsPress={() => setSettingsModalVisible(true)}
        onVoicePress={() => setVoiceModalVisible(true)}
        onVolumePress={() => setVolumeModalVisible(true)}
        voiceAccent={voice.theme.accent}
        volume={volume}
      />

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

      <ViolinPlayAlongHud
        countdownValue={playAlong.countdownValue}
        level={playAlong.level}
        onStop={playAlong.close}
        phase={playAlong.phase}
        progress={playAlong.progress}
        songTitle={playAlong.selectedSong?.title}
      />

      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>
            {error ? t('instruments.violinLoadError') : t('instruments.violinLoading')}
          </Text>
        </View>
      ) : (
        <ViolinFingerboard
          guideSoundId={playAlong.guideSoundId}
          noteLabelMode={noteLabelMode}
          strongGuide={strongGuideHighlight}
          theme={voice.theme}
          onPlayNote={onPlayNote}
        />
      )}

      <PianoMetronomeModal
        bpm={metronomeBpm}
        onChangeBpm={handleMetronomeBpmChange}
        onClose={() => setMetronomeModalVisible(false)}
        showSubdivision
        visible={metronomeModalVisible}
      />

      <PianoVolumeModal
        onChange={handleVolumeChange}
        onClose={() => setVolumeModalVisible(false)}
        visible={volumeModalVisible}
        volume={volume}
      />

      <ViolinVoiceModal
        onClose={() => setVoiceModalVisible(false)}
        onSelect={(nextVoiceId) => {
          setVoiceId(nextVoiceId);
          setVoiceModalVisible(false);
        }}
        selectedVoiceId={voiceId}
        visible={voiceModalVisible}
      />

      <PianoFxModal
        onChange={handleFxSettingsChange}
        onClose={() => setFxModalVisible(false)}
        settings={fxSettings}
        visible={fxModalVisible}
      />

      <ViolinSettingsModal
        haptics={haptics}
        noteLabelMode={noteLabelMode}
        onChangeHaptics={setHaptics}
        onChangeNoteLabelMode={setNoteLabelMode}
        onChangeStrongGuideHighlight={setStrongGuideHighlight}
        onClose={() => setSettingsModalVisible(false)}
        onStartTutorial={playAlong.open}
        strongGuideHighlight={strongGuideHighlight}
        visible={settingsModalVisible}
      />

      <ViolinPlayAlongModal
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
        visible={isPlayAlongModalVisible}
      />

      <LandscapeOverlay visible={isPortrait} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
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
