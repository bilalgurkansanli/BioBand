import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMasterVolume, setMasterVolume } from '../audio/sampleBank';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { StudioOverdubBanner } from '../components/studio/StudioOverdubBanner';
import { PadGrid } from '../components/pads/PadGrid';
import { PadsKitModal } from '../components/pads/PadsKitModal';
import { PadsPlayAlongHud } from '../components/pads/PadsPlayAlongHud';
import { PadsPlayAlongModal } from '../components/pads/PadsPlayAlongModal';
import { PadsSettingsModal } from '../components/pads/PadsSettingsModal';
import { PadsToolbar } from '../components/pads/PadsToolbar';
import { PianoFxModal } from '../components/piano/PianoFxModal';
import { PianoMetronomeModal } from '../components/piano/PianoMetronomeModal';
import { PianoVolumeModal } from '../components/piano/PianoVolumeModal';
import { PlaySpeedHud } from '../components/piano/PlaySpeedHud';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePadsEngine } from '../hooks/usePadsEngine';
import { usePadsPlayAlong } from '../hooks/usePadsPlayAlong';
import type { NoteRepeatRate } from '../hooks/usePadNoteRepeat';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { usePlaySpeed } from '../hooks/usePlaySpeed';
import { useUserPadSongs } from '../hooks/useUserPadSongs';
import { getPadBank, type PadBankId } from '../instruments/pads/padsBanks';
import type { PadSoundId } from '../instruments/pads/padsSounds';
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
  DEFAULT_PADS_UI_SETTINGS,
  loadPadsUiSettings,
  savePadsUiSettings,
} from '../storage/padsSettingsStorage';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

const FX_APPLY_DEBOUNCE_MS = 80;

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Pads'>;

export function PadsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [bankId, setBankId] = useState<PadBankId>('drums');
  const bank = getPadBank(bankId);
  const { ready, error, triggerPad } = usePadsEngine(bankId);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [kitModalVisible, setKitModalVisible] = useState(false);

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
  const [showPadLabels, setShowPadLabels] = useState(
    DEFAULT_PADS_UI_SETTINGS.showPadLabels,
  );
  const [strongGuideHighlight, setStrongGuideHighlight] = useState(
    DEFAULT_PADS_UI_SETTINGS.strongGuideHighlight,
  );
  const [showSpeedHud, setShowSpeedHud] = useState(DEFAULT_PADS_UI_SETTINGS.showSpeedHud);
  const [noteRepeatEnabled, setNoteRepeatEnabled] = useState(
    DEFAULT_PADS_UI_SETTINGS.noteRepeatEnabled,
  );
  const [noteRepeatRate, setNoteRepeatRate] = useState<NoteRepeatRate>(
    DEFAULT_PADS_UI_SETTINGS.noteRepeatRate,
  );

  const { notesPerSec, recordNoteOn, maxNotesPerSec } = usePlaySpeed();

  const {
    isRecording,
    mode,
    handleRecordPress,
    captureEvent,
    studioArmed,
    studioProjectTitle,
    countdown,
    cancelStudioOverdub,
  } = useInstrumentRecording('pads');
  const { isPortrait } = usePianoOrientation(navigation);

  const userSongs = useUserPadSongs();
  const playAlong = usePadsPlayAlong(triggerPad, userSongs.songs);

  useEffect(() => {
    let cancelled = false;
    void loadPadsUiSettings().then((settings) => {
      if (cancelled) {
        return;
      }
      setShowPadLabels(settings.showPadLabels);
      setStrongGuideHighlight(settings.strongGuideHighlight);
      setShowSpeedHud(settings.showSpeedHud);
      setNoteRepeatEnabled(settings.noteRepeatEnabled);
      setNoteRepeatRate(settings.noteRepeatRate);
      setBankId(settings.bankId);
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
    void savePadsUiSettings({
      showPadLabels,
      strongGuideHighlight,
      showSpeedHud,
      noteRepeatEnabled,
      noteRepeatRate,
      bankId,
      fx: fxSettings,
    });
  }, [
    settingsHydrated,
    showPadLabels,
    strongGuideHighlight,
    showSpeedHud,
    noteRepeatEnabled,
    noteRepeatRate,
    bankId,
    fxSettings,
  ]);

  useEffect(() => {
    return () => {
      stopMetronome();
    };
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

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageSize({ width, height });
  };

  const onTrigger = useCallback(
    (id: PadSoundId) => {
      captureEvent(id);
      recordNoteOn();

      if (playAlong.isActive) {
        playAlong.handlePadPress(id);
        return;
      }

      triggerPad(id);
    },
    [captureEvent, playAlong, recordNoteOn, triggerPad],
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
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <PadsToolbar
        fxOn={isAnyPianoFxEnabled(fxSettings)}
        isRecording={isRecording}
        kitAccent={bank.theme.accent}
        metronomeOn={metronomeOn}
        noteRepeatOn={noteRepeatEnabled}
        onBack={() => navigation.goBack()}
        onFxPress={handleOpenFx}
        onGamePress={playAlong.open}
        onKitPress={() => setKitModalVisible(true)}
        onMetronomeLongPress={() => {
          if (metronomeOn) {
            setMetronomeModalVisible(true);
          }
        }}
        onMetronomePress={handleMetronomePress}
        onNoteRepeatLongPress={() => {
          setNoteRepeatRate((prev) => (prev === 'sixteenth' ? 'eighth' : 'sixteenth'));
          setNoteRepeatEnabled(true);
        }}
        onNoteRepeatPress={() => setNoteRepeatEnabled((prev) => !prev)}
        onRecordPress={handleRecordPress}
        onSettingsPress={() => setSettingsModalVisible(true)}
        onVolumePress={() => setVolumeModalVisible(true)}
        volume={volume}
      />

      {studioArmed && studioProjectTitle ? (
        <StudioOverdubBanner
          countdown={countdown}
          projectTitle={studioProjectTitle}
          onCancel={cancelStudioOverdub}
        />
      ) : (
        <RecordingBanner isRecording={isRecording} mode={mode} />
      )}

      {showSpeedHud ? (
        <PlaySpeedHud maxNotesPerSec={maxNotesPerSec} notesPerSec={notesPerSec} />
      ) : null}

      <PadsPlayAlongHud
        countdownValue={playAlong.countdownValue}
        level={playAlong.level}
        onStop={playAlong.close}
        phase={playAlong.phase}
        progress={playAlong.progress}
        songTitle={playAlong.selectedSong?.title}
      />

      <View style={styles.stage} onLayout={handleLayout}>
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>
              {error ? t('instruments.padsLoadError') : t('instruments.padsLoading')}
            </Text>
          </View>
        ) : stageSize.width > 0 && stageSize.height > 0 ? (
          <PadGrid
            accent={bank.theme.accent}
            bankId={bankId}
            guidePadId={playAlong.guidePadId}
            height={stageSize.height}
            noteRepeatBpm={metronomeBpm}
            noteRepeatEnabled={noteRepeatEnabled && !playAlong.isActive}
            noteRepeatRate={noteRepeatRate}
            onTrigger={onTrigger}
            showPadLabels={showPadLabels}
            stageBg={bank.theme.stageBg}
            stageOverlay={bank.theme.stageOverlay}
            strongGuide={strongGuideHighlight}
            width={stageSize.width}
          />
        ) : null}
      </View>

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

      <PadsKitModal
        onClose={() => setKitModalVisible(false)}
        onSelect={(nextBankId) => {
          setBankId(nextBankId);
          setKitModalVisible(false);
        }}
        selectedBankId={bankId}
        visible={kitModalVisible}
      />

      <PianoFxModal
        onChange={handleFxSettingsChange}
        onClose={() => setFxModalVisible(false)}
        settings={fxSettings}
        visible={fxModalVisible}
      />

      <PadsSettingsModal
        noteRepeatEnabled={noteRepeatEnabled}
        noteRepeatRate={noteRepeatRate}
        onChangeNoteRepeatEnabled={setNoteRepeatEnabled}
        onChangeNoteRepeatRate={setNoteRepeatRate}
        onChangeShowPadLabels={setShowPadLabels}
        onChangeShowSpeedHud={setShowSpeedHud}
        onChangeStrongGuideHighlight={setStrongGuideHighlight}
        onClose={() => setSettingsModalVisible(false)}
        onStartTutorial={playAlong.open}
        showPadLabels={showPadLabels}
        showSpeedHud={showSpeedHud}
        strongGuideHighlight={strongGuideHighlight}
        visible={settingsModalVisible}
      />

      <PadsPlayAlongModal
        audioBusy={playAlong.audioBusy}
        calibrateOffsetMs={playAlong.calibrateOffsetMs}
        calibratePreviewing={playAlong.calibratePreviewing}
        demoJustFinished={playAlong.demoJustFinished}
        hasBackingAudio={playAlong.hasBackingAudio}
        importing={userSongs.importing}
        offsetMaxMs={playAlong.offsetMaxMs}
        offsetMinMs={playAlong.offsetMinMs}
        onBackToSongList={playAlong.backToSongList}
        onClose={playAlong.close}
        onConfirmCalibrate={playAlong.confirmCalibrate}
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
        onPreviewCalibrate={playAlong.previewCalibrate}
        onReplay={playAlong.replay}
        onSelectLevel={playAlong.selectLevel}
        onSelectPlayMode={playAlong.selectPlayMode}
        onSelectScope={playAlong.selectScope}
        onSelectSong={playAlong.selectSong}
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
  stage: {
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
