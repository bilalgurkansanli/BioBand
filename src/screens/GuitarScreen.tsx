import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMasterVolume, setMasterVolume } from '../audio/sampleBank';
import { Fretboard } from '../components/guitar/Fretboard';
import { GuitarPlayAlongHud } from '../components/guitar/GuitarPlayAlongHud';
import { GuitarPlayAlongModal } from '../components/guitar/GuitarPlayAlongModal';
import { GuitarSettingsModal } from '../components/guitar/GuitarSettingsModal';
import { GuitarToolbar } from '../components/guitar/GuitarToolbar';
import { GuitarVoiceModal } from '../components/guitar/GuitarVoiceModal';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { PianoFxModal } from '../components/piano/PianoFxModal';
import { PianoMetronomeModal } from '../components/piano/PianoMetronomeModal';
import { PianoVolumeModal } from '../components/piano/PianoVolumeModal';
import { useGuitarEngine } from '../hooks/useGuitarEngine';
import { useGuitarPlayAlong } from '../hooks/useGuitarPlayAlong';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import type { ChordId } from '../instruments/guitar/guitarChords';
import {
  formatChordSoundId,
  formatPluckSoundId,
  type GuitarStringId,
} from '../instruments/guitar/guitarSounds';
import { getGuitarVoice, type GuitarVoiceId } from '../instruments/guitar/guitarVoices';
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
  DEFAULT_GUITAR_UI_SETTINGS,
  loadGuitarUiSettings,
  saveGuitarUiSettings,
} from '../storage/guitarSettingsStorage';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

const FX_APPLY_DEBOUNCE_MS = 80;

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Guitar'>;

export function GuitarScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [voiceId, setVoiceId] = useState<GuitarVoiceId>('nylon');
  const voice = getGuitarVoice(voiceId);
  const { ready, error, pluckString, strumChord, playSoundId } = useGuitarEngine(voiceId);

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
  const [showFretNumbers, setShowFretNumbers] = useState(
    DEFAULT_GUITAR_UI_SETTINGS.showFretNumbers,
  );
  const [strongGuideHighlight, setStrongGuideHighlight] = useState(
    DEFAULT_GUITAR_UI_SETTINGS.strongGuideHighlight,
  );

  const { isRecording, mode, handleRecordPress, captureEvent } =
    useInstrumentRecording('guitar');
  const { isPortrait } = usePianoOrientation(navigation);
  const playAlong = useGuitarPlayAlong(playSoundId);

  useEffect(() => {
    let cancelled = false;
    void loadGuitarUiSettings().then((settings) => {
      if (cancelled) {
        return;
      }
      setShowFretNumbers(settings.showFretNumbers);
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
    void saveGuitarUiSettings({ showFretNumbers, strongGuideHighlight });
  }, [settingsHydrated, showFretNumbers, strongGuideHighlight]);

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

  const onPluck = useCallback(
    (stringId: GuitarStringId, fret: number) => {
      const soundId = formatPluckSoundId(stringId, fret);
      captureEvent(soundId);

      if (playAlong.isActive) {
        playAlong.handleSoundPress(soundId);
        return;
      }

      pluckString(stringId, fret);
    },
    [captureEvent, playAlong, pluckString],
  );

  const onStrum = useCallback(
    (chordId: ChordId) => {
      const soundId = formatChordSoundId(chordId);
      captureEvent(soundId);

      if (playAlong.isActive) {
        playAlong.handleSoundPress(soundId);
        return;
      }

      strumChord(chordId);
    },
    [captureEvent, playAlong, strumChord],
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
      <GuitarToolbar
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

      <RecordingBanner isRecording={isRecording} mode={mode} />

      <GuitarPlayAlongHud
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
            {error ? t('instruments.guitarLoadError') : t('instruments.guitarLoading')}
          </Text>
        </View>
      ) : (
        <Fretboard
          accent={voice.theme.accent}
          guideSoundId={playAlong.guideSoundId}
          onPluck={onPluck}
          onStrum={onStrum}
          showFretNumbers={showFretNumbers}
          stageBg={voice.theme.stageBg}
          strongGuide={strongGuideHighlight}
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

      <GuitarVoiceModal
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

      <GuitarSettingsModal
        onChangeShowFretNumbers={setShowFretNumbers}
        onChangeStrongGuideHighlight={setStrongGuideHighlight}
        onClose={() => setSettingsModalVisible(false)}
        onStartTutorial={playAlong.open}
        showFretNumbers={showFretNumbers}
        strongGuideHighlight={strongGuideHighlight}
        visible={settingsModalVisible}
      />

      <GuitarPlayAlongModal
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
