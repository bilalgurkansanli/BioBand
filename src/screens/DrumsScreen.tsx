import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMasterVolume, setMasterVolume } from '../audio/sampleBank';
import { DrumKit } from '../components/drums/DrumKit';
import { DrumsKitModal } from '../components/drums/DrumsKitModal';
import { DrumsPlayAlongHud } from '../components/drums/DrumsPlayAlongHud';
import { DrumsPlayAlongModal } from '../components/drums/DrumsPlayAlongModal';
import {
  DrumsSettingsModal,
  type DrumsAmbienceId,
} from '../components/drums/DrumsSettingsModal';
import { DrumsToolbar } from '../components/drums/DrumsToolbar';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { StudioOverdubBanner } from '../components/studio/StudioOverdubBanner';
import { PianoFxModal } from '../components/piano/PianoFxModal';
import { PianoMetronomeModal } from '../components/piano/PianoMetronomeModal';
import { PianoVolumeModal } from '../components/piano/PianoVolumeModal';
import { useDrumsEngine } from '../hooks/useDrumsEngine';
import { useDrumsPlayAlong } from '../hooks/useDrumsPlayAlong';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { useUserDrumSongs } from '../hooks/useUserDrumSongs';
import { chokePad } from '../instruments/drums/drumsEngine';
import { getDrumKit, type DrumKitId } from '../instruments/drums/drumsKits';
import type { DrumSoundId } from '../instruments/drums/drumsSounds';
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
  DEFAULT_DRUMS_UI_SETTINGS,
  loadDrumsUiSettings,
  saveDrumsUiSettings,
} from '../storage/drumsSettingsStorage';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';
import { shade } from '../utils/colorMix';

const FX_APPLY_DEBOUNCE_MS = 80;

/** Room-feel presets: one-tap reverb spaces (echo/distortion off). */
const AMBIENCE_REVERB: Record<
  Exclude<DrumsAmbienceId, 'dry'>,
  { timeSeconds: number; mix: number }
> = {
  garage: { timeSeconds: 0.6, mix: 0.35 },
  studio: { timeSeconds: 1.2, mix: 0.5 },
  arena: { timeSeconds: 2.6, mix: 0.7 },
};

function buildAmbienceFx(
  base: PianoFxSettings,
  preset: DrumsAmbienceId,
): PianoFxSettings {
  const reverb =
    preset === 'dry'
      ? { ...base.reverb, enabled: false }
      : { ...base.reverb, enabled: true, ...AMBIENCE_REVERB[preset] };
  return {
    distortion: { ...base.distortion, enabled: false },
    echo: { ...base.echo, enabled: false },
    reverb,
  };
}

function detectAmbience(fx: PianoFxSettings): DrumsAmbienceId | null {
  if (fx.distortion.enabled || fx.echo.enabled) {
    return null;
  }
  if (!fx.reverb.enabled) {
    return 'dry';
  }
  for (const [id, preset] of Object.entries(AMBIENCE_REVERB)) {
    if (
      Math.abs(fx.reverb.timeSeconds - preset.timeSeconds) < 0.05 &&
      Math.abs(fx.reverb.mix - preset.mix) < 0.05
    ) {
      return id as DrumsAmbienceId;
    }
  }
  return null;
}

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Drums'>;

export function DrumsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [kitId, setKitId] = useState<DrumKitId>('acoustic');
  const kit = getDrumKit(kitId);
  const { ready, error, playHit } = useDrumsEngine(kitId);
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
    DEFAULT_DRUMS_UI_SETTINGS.showPadLabels,
  );
  const [strongGuideHighlight, setStrongGuideHighlight] = useState(
    DEFAULT_DRUMS_UI_SETTINGS.strongGuideHighlight,
  );
  const [haptics, setHaptics] = useState(DEFAULT_DRUMS_UI_SETTINGS.haptics);
  const [padScale, setPadScale] = useState(DEFAULT_DRUMS_UI_SETTINGS.padScale);

  const {
    isRecording,
    mode,
    handleRecordPress,
    captureEvent,
    studioArmed,
    studioProjectTitle,
    countdown,
    cancelStudioOverdub,
    recordModePicker,
  } = useInstrumentRecording('drums');
  const { isPortrait } = usePianoOrientation(navigation);

  const userSongs = useUserDrumSongs();
  const playAlong = useDrumsPlayAlong(playHit, userSongs.songs);

  useEffect(() => {
    let cancelled = false;
    void loadDrumsUiSettings().then((settings) => {
      if (cancelled) {
        return;
      }
      setShowPadLabels(settings.showPadLabels);
      setStrongGuideHighlight(settings.strongGuideHighlight);
      setHaptics(settings.haptics);
      setPadScale(settings.padScale);
      setKitId(settings.kitId);
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
    void saveDrumsUiSettings({
      showPadLabels,
      strongGuideHighlight,
      haptics,
      padScale,
      kitId,
      fx: fxSettings,
    });
  }, [
    settingsHydrated,
    showPadLabels,
    strongGuideHighlight,
    haptics,
    padScale,
    kitId,
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

  const onHit = useCallback(
    (id: DrumSoundId, velocity: number) => {
      if (haptics) {
        // Crisp tick per hit — [wait, duration] form is honored more reliably
        // than a bare number across Android vibrators; iOS plays its default tap.
        Vibration.vibrate([0, 35]);
      }

      captureEvent(id, velocity);

      if (playAlong.isActive) {
        // Charts only know the base pads — the rim zone counts as snare here.
        playAlong.handlePadPress(id === 'snareRim' ? 'snare' : id);
        return;
      }

      playHit(id, velocity);
    },
    [captureEvent, haptics, playAlong, playHit],
  );

  const onChoke = useCallback((id: DrumSoundId) => {
    chokePad(id);
  }, []);

  const handleApplyAmbience = useCallback(
    (preset: DrumsAmbienceId) => {
      handleFxSettingsChange(buildAmbienceFx(fxSettingsRef.current, preset));
    },
    [handleFxSettingsChange],
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
          // Whole screen sinks into the kit's stage color for immersion.
          backgroundColor: shade(kit.theme.stageBg, 0.35),
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <DrumsToolbar
        fxOn={isAnyPianoFxEnabled(fxSettings)}
        isRecording={isRecording}
        kitAccent={kit.theme.accent}
        metronomeOn={metronomeOn}
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

      {recordModePicker}

      <DrumsPlayAlongHud
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
              {error ? t('instruments.drumsLoadError') : t('instruments.drumsLoading')}
            </Text>
          </View>
        ) : stageSize.width > 0 && stageSize.height > 0 ? (
          <View style={styles.kitWrap}>
            <DrumKit
              accent={kit.theme.accent}
              cymbalColor={kit.theme.cymbal}
              guidePadId={playAlong.guidePadId}
              headColor={kit.theme.head}
              height={stageSize.height}
              onChoke={onChoke}
              onHit={onHit}
              shellColor={kit.theme.shell}
              showPadLabels={showPadLabels}
              sizeScale={padScale}
              stageBg={kit.theme.stageBg}
              stageOverlay={kit.theme.stageOverlay}
              strongGuide={strongGuideHighlight}
              width={stageSize.width}
            />
          </View>
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

      <DrumsKitModal
        onClose={() => setKitModalVisible(false)}
        onSelect={(nextKitId) => {
          setKitId(nextKitId);
          setKitModalVisible(false);
        }}
        selectedKitId={kitId}
        visible={kitModalVisible}
      />

      <PianoFxModal
        onChange={handleFxSettingsChange}
        onClose={() => setFxModalVisible(false)}
        settings={fxSettings}
        visible={fxModalVisible}
      />

      <DrumsSettingsModal
        activeAmbience={detectAmbience(fxSettings)}
        haptics={haptics}
        onApplyAmbience={handleApplyAmbience}
        onChangeHaptics={setHaptics}
        onChangePadScale={setPadScale}
        onChangeShowPadLabels={setShowPadLabels}
        onChangeStrongGuideHighlight={setStrongGuideHighlight}
        onClose={() => setSettingsModalVisible(false)}
        onStartTutorial={playAlong.open}
        padScale={padScale}
        showPadLabels={showPadLabels}
        strongGuideHighlight={strongGuideHighlight}
        visible={settingsModalVisible}
      />

      <DrumsPlayAlongModal
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
  stage: {
    flex: 1,
  },
  kitWrap: {
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
  },
});
