import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMasterVolume, setMasterVolume } from '../audio/sampleBank';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { StudioOverdubBanner } from '../components/studio/StudioOverdubBanner';
import { LooperBar } from '../components/pads/LooperBar';
import { PadEditModal } from '../components/pads/PadEditModal';
import { PadGrid } from '../components/pads/PadGrid';
import { PadsKitModal } from '../components/pads/PadsKitModal';
import { PadsPlayAlongHud } from '../components/pads/PadsPlayAlongHud';
import { PadsPlayAlongModal } from '../components/pads/PadsPlayAlongModal';
import { PadsSettingsModal } from '../components/pads/PadsSettingsModal';
import { PadsToolbar } from '../components/pads/PadsToolbar';
import { XYPad } from '../components/pads/XYPad';
import { PianoFxModal } from '../components/piano/PianoFxModal';
import { PianoMetronomeModal } from '../components/piano/PianoMetronomeModal';
import { PianoVolumeModal } from '../components/piano/PianoVolumeModal';
import { PlaySpeedHud } from '../components/piano/PlaySpeedHud';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePadsEngine } from '../hooks/usePadsEngine';
import { usePadsLooper } from '../hooks/usePadsLooper';
import { usePadsPlayAlong } from '../hooks/usePadsPlayAlong';
import type { NoteRepeatRate } from '../hooks/usePadNoteRepeat';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { usePlaySpeed } from '../hooks/usePlaySpeed';
import { useUserPadSongs } from '../hooks/useUserPadSongs';
import {
  getPadBank,
  setCustomPadSlots,
  type CustomPadSlot,
  type PadBankId,
} from '../instruments/pads/padsBanks';
import {
  evictUserPadSample,
  refreshCustomPadBank,
  releasePadsPerformanceFilter,
  setPadsPerformanceFilter,
} from '../instruments/pads/padsEngine';
import { PAD_SOUND_IDS, type PadSoundId } from '../instruments/pads/padsSounds';
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
  deletePadSampleFile,
  loadCustomPadSlots,
  saveCustomPadSlots,
} from '../storage/padsCustomBankStorage';
import {
  DEFAULT_PADS_UI_SETTINGS,
  loadPadsUiSettings,
  savePadsUiSettings,
  type PadLabelMode,
  type PadQuantizeMode,
  type PadVelocityCurve,
  type PadVelocityMode,
} from '../storage/padsSettingsStorage';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList, RootTabParamList } from '../types/navigation';

const FX_APPLY_DEBOUNCE_MS = 80;
const XY_PANEL_WIDTH = 170;

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Pads'>;

export function PadsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NavigationProp<RootTabParamList>>();
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
  const [labelMode, setLabelMode] = useState<PadLabelMode>(
    DEFAULT_PADS_UI_SETTINGS.labelMode,
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
  const [velocityMode, setVelocityMode] = useState<PadVelocityMode>(
    DEFAULT_PADS_UI_SETTINGS.velocityMode,
  );
  const [velocityCurve, setVelocityCurve] = useState<PadVelocityCurve>(
    DEFAULT_PADS_UI_SETTINGS.velocityCurve,
  );
  const [haptics, setHaptics] = useState(DEFAULT_PADS_UI_SETTINGS.haptics);
  const [padTrail, setPadTrail] = useState(DEFAULT_PADS_UI_SETTINGS.padTrail);
  const [stageLight, setStageLight] = useState(DEFAULT_PADS_UI_SETTINGS.stageLight);
  const [quantize, setQuantize] = useState<PadQuantizeMode>(
    DEFAULT_PADS_UI_SETTINGS.quantize,
  );
  const [xySurface, setXySurface] = useState(DEFAULT_PADS_UI_SETTINGS.xySurface);

  const hapticsRef = useRef(haptics);
  hapticsRef.current = haptics;
  const stageLightRef = useRef(stageLight);
  stageLightRef.current = stageLight;
  const bankIdRef = useRef(bankId);
  bankIdRef.current = bankId;
  const quantizeRef = useRef(quantize);
  quantizeRef.current = quantize;

  // Custom bank editing.
  const [customSlots, setCustomSlotsState] = useState<CustomPadSlot[] | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  /** Invalidates PadGrid's cached labels/colors after a custom-slot edit. */
  const [slotsRevision, setSlotsRevision] = useState(0);

  // Looper.
  const [looperVisible, setLooperVisible] = useState(false);
  const [ghost, setGhost] = useState<{ id: PadSoundId; stamp: number } | null>(null);
  const stageLightPulse = useRef(new Animated.Value(0)).current;

  const pulseStageLight = useCallback(() => {
    if (!stageLightRef.current) {
      return;
    }
    stageLightPulse.setValue(1);
    Animated.timing(stageLightPulse, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [stageLightPulse]);

  const handleScheduledHit = useCallback(
    (padId: PadSoundId) => {
      setGhost((previous) => ({ id: padId, stamp: (previous?.stamp ?? 0) + 1 }));
      pulseStageLight();
    },
    [pulseStageLight],
  );

  const looper = usePadsLooper({
    getBankId: () => bankIdRef.current,
    getQuantize: () => quantizeRef.current,
    onScheduledHit: handleScheduledHit,
  });
  const looperRef = useRef(looper);
  looperRef.current = looper;

  const { notesPerSec, recordNoteOn, maxNotesPerSec } = usePlaySpeed(showSpeedHud);

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
  } = useInstrumentRecording('pads');
  const { isPortrait } = usePianoOrientation(navigation);

  const userSongs = useUserPadSongs();
  const playAlong = usePadsPlayAlong(triggerPad, userSongs.songs);
  // Refs keep onTrigger's identity stable across renders — the play-along
  // hook returns a fresh object every render, and an unstable onTrigger would
  // re-render the whole 4x4 grid on every screen render (visible as jank
  // while drumming with the speed HUD or a session active).
  const playAlongRef = useRef(playAlong);
  playAlongRef.current = playAlong;
  const captureEventRef = useRef(captureEvent);
  captureEventRef.current = captureEvent;

  useEffect(() => {
    let cancelled = false;
    void loadPadsUiSettings().then((settings) => {
      if (cancelled) {
        return;
      }
      setLabelMode(settings.labelMode);
      setStrongGuideHighlight(settings.strongGuideHighlight);
      setShowSpeedHud(settings.showSpeedHud);
      setNoteRepeatEnabled(settings.noteRepeatEnabled);
      setNoteRepeatRate(settings.noteRepeatRate);
      setBankId(settings.bankId);
      setVelocityMode(settings.velocityMode);
      setVelocityCurve(settings.velocityCurve);
      setHaptics(settings.haptics);
      setPadTrail(settings.padTrail);
      setStageLight(settings.stageLight);
      setQuantize(settings.quantize);
      setXySurface(settings.xySurface);
      fxSettingsRef.current = settings.fx;
      setFxSettings(settings.fx);
      applyPianoFxSettings(settings.fx);
      setSettingsHydrated(true);
    });
    void loadCustomPadSlots().then((slots) => {
      if (cancelled) {
        return;
      }
      setCustomPadSlots(slots);
      setCustomSlotsState(slots);
      setSlotsRevision((previous) => previous + 1);
      // The engine may have warmed the custom bank before this hydration
      // landed — re-warm so user samples are decoded and playable.
      void refreshCustomPadBank();
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
      labelMode,
      strongGuideHighlight,
      showSpeedHud,
      noteRepeatEnabled,
      noteRepeatRate,
      bankId,
      fx: fxSettings,
      velocityMode,
      velocityCurve,
      haptics,
      padTrail,
      stageLight,
      quantize,
      xySurface,
    });
  }, [
    settingsHydrated,
    labelMode,
    strongGuideHighlight,
    showSpeedHud,
    noteRepeatEnabled,
    noteRepeatRate,
    bankId,
    fxSettings,
    velocityMode,
    velocityCurve,
    haptics,
    padTrail,
    stageLight,
    quantize,
    xySurface,
  ]);

  useEffect(() => {
    return () => {
      stopMetronome();
    };
  }, []);

  // Leaving the custom bank always exits edit mode.
  useEffect(() => {
    if (bankId !== 'custom') {
      setEditMode(false);
    }
  }, [bankId]);

  // Lessons carry the bank they teach: picking "Çiftetelli" swaps to the
  // Turkish bank before the demo plays, "Hip-Hop 90" to drums, and the bank
  // stays after the session so practice can continue on the right sounds.
  const lessonBankId = playAlong.selectedSong?.bankId;
  useEffect(() => {
    if (lessonBankId && lessonBankId !== bankIdRef.current) {
      setBankId(lessonBankId);
    }
  }, [lessonBankId]);

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
    (id: PadSoundId, velocity: number) => {
      captureEventRef.current(id, velocity);
      recordNoteOn();
      if (hapticsRef.current) {
        Vibration.vibrate([0, 18]);
      }

      const activePlayAlong = playAlongRef.current;
      if (activePlayAlong.isActive) {
        activePlayAlong.handlePadPress(id);
        return;
      }

      looperRef.current.captureHit(id, velocity);
      pulseStageLight();
      triggerPad(id, velocity);
    },
    [pulseStageLight, recordNoteOn, triggerPad],
  );

  // --- Custom bank editing ---------------------------------------------------

  const openSlotEditor = useCallback((padId: PadSoundId) => {
    const index = PAD_SOUND_IDS.indexOf(padId);
    if (index >= 0) {
      setEditingSlotIndex(index);
    }
  }, []);

  const handleSaveSlot = useCallback(
    (slotIndex: number, nextSlot: CustomPadSlot) => {
      setEditingSlotIndex(null);
      setCustomSlotsState((previous) => {
        if (!previous) {
          return previous;
        }
        const replaced = previous[slotIndex];
        const next = previous.map((slot, index) => (index === slotIndex ? nextSlot : slot));

        // A replaced user recording is unreachable now — drop file + cache.
        if (
          replaced?.source.kind === 'user' &&
          (nextSlot.source.kind !== 'user' || nextSlot.source.uri !== replaced.source.uri)
        ) {
          evictUserPadSample(replaced.source.uri);
          deletePadSampleFile(replaced.source.uri);
        }

        setCustomPadSlots(next);
        void saveCustomPadSlots(next);
        void refreshCustomPadBank();
        return next;
      });
      setSlotsRevision((previous) => previous + 1);
    },
    [],
  );

  // --- Looper ----------------------------------------------------------------

  const handleLooperToggle = useCallback(() => {
    setLooperVisible((previous) => {
      if (previous) {
        looperRef.current.stop();
      }
      return !previous;
    });
  }, []);

  // The reverse guard of handleGamePress: while a play-along session (or its
  // wizard) is up, the LooperBar's play button must not start count-in and
  // layer replays over the tutorial.
  const handleLooperStart = useCallback(() => {
    if (playAlongRef.current.phase !== 'idle') {
      return;
    }
    void looperRef.current.start();
  }, []);

  // Any stop path (toggle, blur, game press) clears the ghost flash — a
  // stale stamp replayed a phantom flash on every pad remount (bank switch).
  const looperPhase = looper.phase;
  useEffect(() => {
    if (looperPhase === 'idle') {
      setGhost(null);
    }
  }, [looperPhase]);

  const handleLooperExport = useCallback(() => {
    const title = t('pads.looper.exportTitle', {
      date: new Date().toLocaleDateString(),
    });
    void looperRef.current.exportToStudio(title).then((projectId) => {
      if (!projectId) {
        Alert.alert(t('pads.looper.exportEmpty'));
        return;
      }
      Alert.alert(t('pads.looper.exportDoneTitle'), t('pads.looper.exportDoneMessage'), [
        { text: t('common.close'), style: 'cancel' },
        {
          text: t('pads.looper.exportOpen'),
          onPress: () => {
            looperRef.current.stop();
            rootNavigation.navigate('Recordings', {
              screen: 'StudioProject',
              params: { projectId },
            });
          },
        },
      ]);
    });
  }, [rootNavigation, t]);

  const bankIconFor = useCallback((id: PadBankId) => getPadBank(id).icon, []);

  // Play-along and the looper fight over audio + pad flashes — starting the
  // tutorial always stops a running loop.
  const handleGamePress = useCallback(() => {
    looperRef.current.stop();
    playAlongRef.current.open();
  }, []);

  // --- XY performance filter -------------------------------------------------

  const handleXyChange = useCallback((x: number, y: number) => {
    setPadsPerformanceFilter(x, y);
  }, []);

  const handleXyRelease = useCallback(() => {
    releasePadsPerformanceFilter();
  }, []);

  useEffect(() => {
    if (!xySurface) {
      releasePadsPerformanceFilter();
    }
  }, [xySurface]);

  const isPlayAlongModalVisible =
    playAlong.phase === 'pickSong' ||
    playAlong.phase === 'pickScope' ||
    playAlong.phase === 'pickMode' ||
    playAlong.phase === 'pickAudio' ||
    playAlong.phase === 'calibrateOffset' ||
    playAlong.phase === 'pickLevel' ||
    playAlong.phase === 'results';

  const xyPadHeight = Math.min(280, Math.max(140, stageSize.height - 32));
  const editingSlot =
    editingSlotIndex !== null && customSlots ? customSlots[editingSlotIndex] ?? null : null;

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
        editOn={editMode}
        editVisible={bankId === 'custom'}
        fxOn={isAnyPianoFxEnabled(fxSettings)}
        isRecording={isRecording}
        kitAccent={bank.theme.accent}
        looperOn={looperVisible}
        metronomeOn={metronomeOn}
        noteRepeatOn={noteRepeatEnabled}
        onBack={() => navigation.goBack()}
        onEditPress={() => setEditMode((previous) => !previous)}
        onFxPress={handleOpenFx}
        onGamePress={handleGamePress}
        onKitPress={() => setKitModalVisible(true)}
        onLooperPress={handleLooperToggle}
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
        onXyPress={() => setXySurface((previous) => !previous)}
        volume={volume}
        xyOn={xySurface}
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

      {looperVisible ? (
        <LooperBar
          accent={bank.theme.accent}
          bankIconFor={bankIconFor}
          bars={looper.bars}
          barsLocked={looper.barsLocked}
          bpm={looper.bpm}
          countInBeat={looper.countInBeat}
          cycleStamp={looper.cycleStamp}
          layers={looper.layers}
          loopDurationMs={looper.loopDurationMs}
          onClearLayers={looper.clearLayers}
          onClose={handleLooperToggle}
          onCommitLayer={looper.commitLayer}
          onExport={handleLooperExport}
          onRemoveLayer={looper.removeLayer}
          onSetBars={looper.setBars}
          onStart={handleLooperStart}
          onStop={looper.stop}
          onToggleLayerMuted={looper.toggleLayerMuted}
          onToggleRecArm={looper.toggleRecArm}
          phase={looper.phase}
          recArmed={looper.recArmed}
        />
      ) : null}

      {showSpeedHud ? (
        <PlaySpeedHud maxNotesPerSec={maxNotesPerSec} notesPerSec={notesPerSec} />
      ) : null}

      {editMode && bankId === 'custom' ? (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText}>{t('pads.editor.editModeBanner')}</Text>
        </View>
      ) : null}

      <PadsPlayAlongHud
        countdownValue={playAlong.countdownValue}
        level={playAlong.level}
        onStop={playAlong.close}
        phase={playAlong.phase}
        progress={playAlong.progress}
        songTitle={playAlong.selectedSong?.title}
      />

      <View style={styles.stageRow}>
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
              editMode={editMode && bankId === 'custom'}
              ghost={ghost}
              guidePadId={playAlong.guidePadId}
              height={stageSize.height}
              labelMode={labelMode}
              longPressEnabled={bankId === 'custom' && !noteRepeatEnabled}
              noteRepeatBpm={metronomeBpm}
              noteRepeatEnabled={noteRepeatEnabled && !playAlong.isActive}
              noteRepeatRate={noteRepeatRate}
              onEditPad={openSlotEditor}
              onLongPressPad={openSlotEditor}
              onTrigger={onTrigger}
              padTrail={padTrail}
              slotsRevision={slotsRevision}
              stageBg={bank.theme.stageBg}
              stageLightPulse={stageLight ? stageLightPulse : null}
              stageOverlay={bank.theme.stageOverlay}
              strongGuide={strongGuideHighlight}
              velocityCurve={velocityCurve}
              velocityMode={velocityMode}
              width={stageSize.width}
            />
          ) : null}
        </View>

        {xySurface && ready ? (
          <View style={styles.xyPanel}>
            <XYPad
              accent={bank.theme.accent}
              height={xyPadHeight}
              onChange={handleXyChange}
              onRelease={handleXyRelease}
              width={XY_PANEL_WIDTH - 18}
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
        haptics={haptics}
        labelMode={labelMode}
        noteRepeatEnabled={noteRepeatEnabled}
        noteRepeatRate={noteRepeatRate}
        onChangeHaptics={setHaptics}
        onChangeLabelMode={setLabelMode}
        onChangeNoteRepeatEnabled={setNoteRepeatEnabled}
        onChangeNoteRepeatRate={setNoteRepeatRate}
        onChangePadTrail={setPadTrail}
        onChangeQuantize={setQuantize}
        onChangeShowSpeedHud={setShowSpeedHud}
        onChangeStageLight={setStageLight}
        onChangeStrongGuideHighlight={setStrongGuideHighlight}
        onChangeVelocityCurve={setVelocityCurve}
        onChangeVelocityMode={setVelocityMode}
        onClose={() => setSettingsModalVisible(false)}
        onStartTutorial={handleGamePress}
        padTrail={padTrail}
        quantize={quantize}
        showSpeedHud={showSpeedHud}
        stageLight={stageLight}
        strongGuideHighlight={strongGuideHighlight}
        velocityCurve={velocityCurve}
        velocityMode={velocityMode}
        visible={settingsModalVisible}
      />

      <PadEditModal
        accent={bank.theme.accent}
        onClose={() => setEditingSlotIndex(null)}
        onSave={handleSaveSlot}
        slot={editingSlot}
        slotIndex={editingSlotIndex ?? 0}
        visible={editingSlotIndex !== null}
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
  stageRow: {
    flex: 1,
    flexDirection: 'row',
  },
  stage: {
    flex: 1,
  },
  xyPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 8,
    width: XY_PANEL_WIDTH,
  },
  editBanner: {
    backgroundColor: '#0E2A24',
    borderBottomColor: '#00D1B255',
    borderBottomWidth: 1,
    paddingVertical: 5,
  },
  editBannerText: {
    color: '#00D1B2',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
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
