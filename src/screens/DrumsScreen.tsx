import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMasterVolume, setMasterVolume } from '../audio/sampleBank';
import { DrumKit } from '../components/drums/DrumKit';
import { DrumsKitModal } from '../components/drums/DrumsKitModal';
import { DrumsPlayAlongHud } from '../components/drums/DrumsPlayAlongHud';
import { DrumsPlayAlongModal } from '../components/drums/DrumsPlayAlongModal';
import { DrumsSettingsModal } from '../components/drums/DrumsSettingsModal';
import { DrumsToolbar } from '../components/drums/DrumsToolbar';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { PianoFxModal } from '../components/piano/PianoFxModal';
import { PianoMetronomeModal } from '../components/piano/PianoMetronomeModal';
import { PianoVolumeModal } from '../components/piano/PianoVolumeModal';
import { useDrumsEngine } from '../hooks/useDrumsEngine';
import { useDrumsPlayAlong } from '../hooks/useDrumsPlayAlong';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { useUserDrumSongs } from '../hooks/useUserDrumSongs';
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

const FX_APPLY_DEBOUNCE_MS = 80;

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

  const { isRecording, mode, handleRecordPress, captureEvent } =
    useInstrumentRecording('drums');
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
    void saveDrumsUiSettings({ showPadLabels, strongGuideHighlight });
  }, [settingsHydrated, showPadLabels, strongGuideHighlight]);

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
    (id: DrumSoundId) => {
      captureEvent(id);

      if (playAlong.isActive) {
        playAlong.handlePadPress(id);
        return;
      }

      playHit(id);
    },
    [captureEvent, playAlong, playHit],
  );

  const isPlayAlongModalVisible =
    playAlong.phase === 'pickSong' ||
    playAlong.phase === 'pickScope' ||
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

      <RecordingBanner isRecording={isRecording} mode={mode} />

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
              guidePadId={playAlong.guidePadId}
              height={stageSize.height}
              onHit={onHit}
              showPadLabels={showPadLabels}
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
        onChangeShowPadLabels={setShowPadLabels}
        onChangeStrongGuideHighlight={setStrongGuideHighlight}
        onClose={() => setSettingsModalVisible(false)}
        onStartTutorial={playAlong.open}
        showPadLabels={showPadLabels}
        strongGuideHighlight={strongGuideHighlight}
        visible={settingsModalVisible}
      />

      <DrumsPlayAlongModal
        demoJustFinished={playAlong.demoJustFinished}
        importing={userSongs.importing}
        onBackToSongList={playAlong.backToSongList}
        onClose={playAlong.close}
        onDeleteUserSong={(songId) => {
          void userSongs.removeSong(songId);
        }}
        onGoBack={playAlong.goBack}
        onImportSong={userSongs.importSong}
        onImportSongFromJsonText={userSongs.importSongFromJsonText}
        onReplay={playAlong.replay}
        onSelectLevel={playAlong.selectLevel}
        onSelectScope={playAlong.selectScope}
        onSelectSong={playAlong.selectSong}
        onSelectTempo={playAlong.setTempo}
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
