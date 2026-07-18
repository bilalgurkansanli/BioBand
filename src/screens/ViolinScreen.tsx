import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
import { useViolinEngine } from '../hooks/useViolinEngine';
import { useViolinPlayAlong } from '../hooks/useViolinPlayAlong';
import {
  normalizeVisiblePhraseIds,
  type PhraseId,
} from '../instruments/violin/violinPhrases';
import {
  formatNoteSoundId,
  formatPhraseSoundId,
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
  const { ready, error, playNote, playPhrase, playSoundId } = useViolinEngine(voiceId);

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
  const [showPositionNumbers, setShowPositionNumbers] = useState(
    DEFAULT_VIOLIN_UI_SETTINGS.showPositionNumbers,
  );
  const [strongGuideHighlight, setStrongGuideHighlight] = useState(
    DEFAULT_VIOLIN_UI_SETTINGS.strongGuideHighlight,
  );
  const [visiblePhraseIds, setVisiblePhraseIds] = useState<PhraseId[]>(
    () => [...DEFAULT_VIOLIN_UI_SETTINGS.visiblePhraseIds],
  );

  const {
    isRecording,
    mode,
    handleRecordPress,
    captureEvent,
    studioArmed,
    studioProjectTitle,
    countdown,
    cancelStudioOverdub,
  } = useInstrumentRecording('violin');
  const { isPortrait } = usePianoOrientation(navigation);
  const playAlong = useViolinPlayAlong(playSoundId);

  useEffect(() => {
    let cancelled = false;
    void loadViolinUiSettings().then((settings) => {
      if (cancelled) {
        return;
      }
      setShowPositionNumbers(settings.showPositionNumbers);
      setStrongGuideHighlight(settings.strongGuideHighlight);
      setVisiblePhraseIds(settings.visiblePhraseIds);
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
      showPositionNumbers,
      strongGuideHighlight,
      visiblePhraseIds,
      voiceId,
      fx: fxSettings,
    });
  }, [
    settingsHydrated,
    showPositionNumbers,
    strongGuideHighlight,
    visiblePhraseIds,
    voiceId,
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

  const onPlayNote = useCallback(
    (stringId: ViolinStringId, position: number) => {
      const soundId = formatNoteSoundId(stringId, position);
      captureEvent(soundId);

      if (playAlong.isActive) {
        if (playAlong.phase === 'demo') {
          return;
        }
        playNote(stringId, position);
        playAlong.handleSoundPress(soundId, { skipPlayback: true });
        return;
      }

      playNote(stringId, position);
    },
    [captureEvent, playAlong, playNote],
  );

  const onPlayPhrase = useCallback(
    (phraseId: PhraseId) => {
      const soundId = formatPhraseSoundId(phraseId);
      captureEvent(soundId);

      if (playAlong.isActive) {
        if (playAlong.phase === 'demo') {
          return;
        }
        playPhrase(phraseId);
        playAlong.handleSoundPress(soundId, { skipPlayback: true });
        return;
      }

      playPhrase(phraseId);
    },
    [captureEvent, playAlong, playPhrase],
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
        <RecordingBanner isRecording={isRecording} mode={mode} />
      )}

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
          showPositionNumbers={showPositionNumbers}
          strongGuide={strongGuideHighlight}
          theme={voice.theme}
          visiblePhraseIds={visiblePhraseIds}
          onPlayNote={onPlayNote}
          onPlayPhrase={onPlayPhrase}
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
        onChangeShowPositionNumbers={setShowPositionNumbers}
        onChangeStrongGuideHighlight={setStrongGuideHighlight}
        onChangeVisiblePhraseIds={(ids) =>
          setVisiblePhraseIds(normalizeVisiblePhraseIds(ids))
        }
        onClose={() => setSettingsModalVisible(false)}
        onStartTutorial={playAlong.open}
        showPositionNumbers={showPositionNumbers}
        strongGuideHighlight={strongGuideHighlight}
        visible={settingsModalVisible}
        visiblePhraseIds={visiblePhraseIds}
      />

      <ViolinPlayAlongModal
        demoJustFinished={playAlong.demoJustFinished}
        onBackToSongList={playAlong.backToSongList}
        onClose={playAlong.close}
        onGoBack={playAlong.goBack}
        onReplay={playAlong.replay}
        onSelectLevel={playAlong.selectLevel}
        onSelectScope={playAlong.selectScope}
        onSelectSong={playAlong.selectSong}
        onSelectTempo={playAlong.setTempo}
        phase={playAlong.phase}
        results={playAlong.results}
        selectedSong={playAlong.selectedSong}
        tempo={playAlong.tempo}
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
