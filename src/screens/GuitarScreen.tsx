import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { hapticNote } from '../utils/haptics';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
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
import { StudioOverdubBanner } from '../components/studio/StudioOverdubBanner';
import { PianoFxModal } from '../components/piano/PianoFxModal';
import { PianoMetronomeModal } from '../components/piano/PianoMetronomeModal';
import { PianoVolumeModal } from '../components/piano/PianoVolumeModal';
import { useGuitarEngine } from '../hooks/useGuitarEngine';
import { useGuitarPlayAlong } from '../hooks/useGuitarPlayAlong';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { useUserGuitarSongs } from '../hooks/useUserGuitarSongs';
import {
  ALL_GUITAR_CHORD_IDS,
  normalizeVisibleChordIds,
  type ChordId,
} from '../instruments/guitar/guitarChords';
import {
  GUITAR_CHORD_PLAY_MODES,
  normalizeVisiblePlayModes,
  type GuitarChordGesture,
  type GuitarChordPlayMode,
} from '../instruments/guitar/guitarChordPatterns';
import {
  setGuitarStrumStaggerScale,
  setGuitarSustainScale,
} from '../instruments/guitar/guitarEngine';
import {
  GUITAR_STRUM_TIGHTNESS_SCALE,
  GUITAR_SUSTAIN_SCALE,
  type GuitarFretRange,
  type GuitarStrumTightnessId,
  type GuitarSustainLengthId,
} from '../instruments/guitar/guitarFeel';
import type { GuitarVelocityCurveId } from '../instruments/guitar/guitarVelocity';
import {
  formatChordPerformanceSoundId,
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
  const {
    ready,
    error,
    noteOn,
    noteOff,
    bendNote,
    pluckString,
    playChord,
    playSoundId,
  } = useGuitarEngine(voiceId);
  const [selectedChordId, setSelectedChordId] = useState<ChordId | null>(null);
  const [chordPlayMode, setChordPlayMode] = useState<GuitarChordPlayMode>(
    DEFAULT_GUITAR_UI_SETTINGS.chordPlayMode,
  );

  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [metronomeModalVisible, setMetronomeModalVisible] = useState(false);

  // Blur releases the engine, which stops the metronome — reset the toolbar
  // state on the way back in, or the button is left reading "on" while nothing
  // is ticking.
  useFocusEffect(
    useCallback(() => {
      setMetronomeOn(false);
      setMetronomeModalVisible(false);
    }, []),
  );
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
  const [haptics, setHaptics] = useState(DEFAULT_GUITAR_UI_SETTINGS.haptics);
  const [bendEnabled, setBendEnabled] = useState(
    DEFAULT_GUITAR_UI_SETTINGS.bendEnabled,
  );
  const [stringAnimation, setStringAnimation] = useState(
    DEFAULT_GUITAR_UI_SETTINGS.stringAnimation,
  );
  const [velocityCurve, setVelocityCurve] = useState<GuitarVelocityCurveId>(
    DEFAULT_GUITAR_UI_SETTINGS.velocityCurve,
  );
  const [strumTightness, setStrumTightness] = useState<GuitarStrumTightnessId>(
    DEFAULT_GUITAR_UI_SETTINGS.strumTightness,
  );
  const [sustainLength, setSustainLength] = useState<GuitarSustainLengthId>(
    DEFAULT_GUITAR_UI_SETTINGS.sustainLength,
  );
  const [maxFret, setMaxFret] = useState<GuitarFretRange>(
    DEFAULT_GUITAR_UI_SETTINGS.maxFret,
  );
  const [showChordPlayModeBar, setShowChordPlayModeBar] = useState(
    DEFAULT_GUITAR_UI_SETTINGS.showChordPlayModeBar,
  );
  const [visiblePlayModes, setVisiblePlayModes] = useState<GuitarChordPlayMode[]>(
    () => [...GUITAR_CHORD_PLAY_MODES],
  );
  const [visibleChordIds, setVisibleChordIds] = useState<ChordId[]>(() => [
    ...ALL_GUITAR_CHORD_IDS,
  ]);

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
  } = useInstrumentRecording('guitar');
  const { isPortrait } = usePianoOrientation(navigation);
  const userSongs = useUserGuitarSongs();
  const playAlong = useGuitarPlayAlong(playSoundId, userSongs.songs);

  useEffect(() => {
    let cancelled = false;
    void loadGuitarUiSettings().then((settings) => {
      if (cancelled) {
        return;
      }
      setShowFretNumbers(settings.showFretNumbers);
      setStrongGuideHighlight(settings.strongGuideHighlight);
      setHaptics(settings.haptics);
      setBendEnabled(settings.bendEnabled);
      setStringAnimation(settings.stringAnimation);
      setVelocityCurve(settings.velocityCurve);
      setStrumTightness(settings.strumTightness);
      setSustainLength(settings.sustainLength);
      setMaxFret(settings.maxFret);
      setShowChordPlayModeBar(settings.showChordPlayModeBar);
      setVisiblePlayModes(settings.visiblePlayModes);
      setVisibleChordIds(settings.visibleChordIds);
      setVoiceId(settings.voiceId);
      setChordPlayMode(settings.chordPlayMode);
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
    void saveGuitarUiSettings({
      showFretNumbers,
      strongGuideHighlight,
      haptics,
      bendEnabled,
      stringAnimation,
      velocityCurve,
      strumTightness,
      sustainLength,
      maxFret,
      showChordPlayModeBar,
      visiblePlayModes,
      visibleChordIds,
      voiceId,
      fx: fxSettings,
      chordPlayMode,
    });
  }, [
    settingsHydrated,
    showFretNumbers,
    strongGuideHighlight,
    haptics,
    bendEnabled,
    stringAnimation,
    velocityCurve,
    strumTightness,
    sustainLength,
    maxFret,
    showChordPlayModeBar,
    visiblePlayModes,
    visibleChordIds,
    voiceId,
    fxSettings,
    chordPlayMode,
  ]);

  // Feel settings live in the engine so chord cascades and replays share them.
  useEffect(() => {
    setGuitarStrumStaggerScale(GUITAR_STRUM_TIGHTNESS_SCALE[strumTightness]);
  }, [strumTightness]);

  useEffect(() => {
    setGuitarSustainScale(GUITAR_SUSTAIN_SCALE[sustainLength]);
  }, [sustainLength]);

  useEffect(() => {
    if (selectedChordId && !visibleChordIds.includes(selectedChordId)) {
      setSelectedChordId(null);
    }
  }, [selectedChordId, visibleChordIds]);

  useEffect(() => {
    if (!visiblePlayModes.includes(chordPlayMode)) {
      setChordPlayMode(visiblePlayModes[0] ?? 'strum');
    }
  }, [chordPlayMode, visiblePlayModes]);

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
    // Skip until stored settings load — otherwise defaults get applied first.
    if (!settingsHydrated) {
      return;
    }
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
  }, [fxSettings, settingsHydrated]);

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

  const onPluckIn = useCallback(
    (stringId: GuitarStringId, fret: number, velocity: number) => {
      if (haptics) {
        hapticNote();
      }

      const soundId = formatPluckSoundId(stringId, fret);
      captureEvent(soundId, velocity);

      if (playAlong.isActive) {
        if (playAlong.phase === 'demo') {
          return;
        }
        // One-shot with touch dynamics; scoring still matches `sN:fF`.
        pluckString(stringId, fret, velocity);
        playAlong.handleSoundPress(soundId, { skipPlayback: true });
        return;
      }

      noteOn(stringId, fret, velocity);
    },
    [captureEvent, haptics, noteOn, playAlong, pluckString],
  );

  const onPluckOut = useCallback(
    (stringId: GuitarStringId, fret: number) => {
      if (playAlong.isActive) {
        return;
      }
      noteOff(stringId, fret);
    },
    [noteOff, playAlong.isActive],
  );

  const onBend = useCallback(
    (stringId: GuitarStringId, fret: number, semitones: number) => {
      // Play-along plucks are one-shots — nothing held to bend.
      if (playAlong.isActive) {
        return;
      }
      bendNote(stringId, fret, semitones);
    },
    [bendNote, playAlong.isActive],
  );

  const onSelectChord = useCallback(
    (
      chordId: ChordId,
      direction: 'down' | 'up' | null,
      gesture: GuitarChordGesture,
    ) => {
      // Tap on armed chord → clear shape (free fretting).
      if (direction === null) {
        if (selectedChordId === chordId) {
          setSelectedChordId(null);
        }
        return;
      }

      if (haptics) {
        hapticNote();
      }

      if (playAlong.isActive) {
        const soundId = formatChordSoundId(chordId);
        captureEvent(soundId);
        if (playAlong.phase === 'demo') {
          return;
        }
        // Tutorial scoring uses `chord:Id`; hear current play mode.
        playChord(chordId, { mode: chordPlayMode, direction, gesture });
        playAlong.handleSoundPress(soundId, { skipPlayback: true });
        return;
      }

      setSelectedChordId(chordId);
      // Record the performance form so playback keeps mode + strum direction.
      captureEvent(
        formatChordPerformanceSoundId(chordId, chordPlayMode, direction, gesture),
      );
      playChord(chordId, { mode: chordPlayMode, direction, gesture });
    },
    [captureEvent, chordPlayMode, haptics, playAlong, playChord, selectedChordId],
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
        <View style={styles.fretboardWrap}>
          <Fretboard
            bendEnabled={bendEnabled}
            chordPlayMode={chordPlayMode}
            guideSoundId={playAlong.guideSoundId}
            maxFret={maxFret}
            onBend={onBend}
            onChordPlayModeChange={setChordPlayMode}
            onPluckIn={onPluckIn}
            onPluckOut={onPluckOut}
            onSelectChord={onSelectChord}
            selectedChordId={selectedChordId}
            showChordPlayModeBar={showChordPlayModeBar}
            showFretNumbers={showFretNumbers}
            stringAnimationEnabled={stringAnimation}
            strongGuide={strongGuideHighlight}
            theme={voice.theme}
            velocityCurve={velocityCurve}
            visibleChordIds={visibleChordIds}
            visiblePlayModes={visiblePlayModes}
          />
        </View>
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
        bendEnabled={bendEnabled}
        haptics={haptics}
        maxFret={maxFret}
        onChangeBendEnabled={setBendEnabled}
        onChangeHaptics={setHaptics}
        onChangeMaxFret={setMaxFret}
        onChangeShowChordPlayModeBar={setShowChordPlayModeBar}
        onChangeShowFretNumbers={setShowFretNumbers}
        onChangeStrongGuideHighlight={setStrongGuideHighlight}
        onChangeStringAnimation={setStringAnimation}
        onChangeStrumTightness={setStrumTightness}
        onChangeSustainLength={setSustainLength}
        onChangeVelocityCurve={setVelocityCurve}
        onChangeVisibleChordIds={(ids) =>
          setVisibleChordIds(normalizeVisibleChordIds(ids))
        }
        onChangeVisiblePlayModes={(modes) =>
          setVisiblePlayModes(normalizeVisiblePlayModes(modes))
        }
        onClose={() => setSettingsModalVisible(false)}
        onStartTutorial={playAlong.open}
        showChordPlayModeBar={showChordPlayModeBar}
        showFretNumbers={showFretNumbers}
        stringAnimation={stringAnimation}
        strongGuideHighlight={strongGuideHighlight}
        strumTightness={strumTightness}
        sustainLength={sustainLength}
        velocityCurve={velocityCurve}
        visible={settingsModalVisible}
        visibleChordIds={visibleChordIds}
        visiblePlayModes={visiblePlayModes}
      />

      <GuitarPlayAlongModal
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
  // Caps the fretboard's width on tablets — otherwise it stretches to fill
  // the whole landscape width, leaving frets/strings absurdly wide.
  fretboardWrap: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 900,
    width: '100%',
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
