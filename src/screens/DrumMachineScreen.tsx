import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';

import {
  prepareOverdubRecordingAudioMode,
  restorePlaybackAudioMode,
} from '../audio/initAudio';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import {
  BpmHoldButton,
  FooterBtn,
  IconBtn,
  LabeledToolbarBtn,
} from '../components/drumMachine/DrumMachineControls';
import { DrumMachineSettingsModal } from '../components/drumMachine/DrumMachineSettingsModal';
import { LoadPatternModal } from '../components/drumMachine/LoadPatternModal';
import { MachineTypeModal } from '../components/drumMachine/MachineTypeModal';
import { SavePatternDialog } from '../components/drumMachine/SavePatternDialog';
import {
  SongModeModal,
  type ResolvedSongEntry,
} from '../components/drumMachine/SongModeModal';
import { StepSequencerGrid } from '../components/drumMachine/StepSequencerGrid';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { OptionListModal } from '../components/studio/OptionListModal';
import { useDrumMachine, type SongChainEntry } from '../hooks/useDrumMachine';
import { useDrumMachineEngine } from '../hooks/useDrumMachineEngine';
import { useLandscapeOrientation as usePianoOrientation } from '../hooks/useLandscapeOrientation';
import type { DrumMachineTypeId } from '../instruments/drumMachine/drumMachineBanks';
import {
  DRUM_MACHINE_PRESETS,
  type DrumMachinePreset,
} from '../instruments/drumMachine/drumMachinePresets';
import type { DrumMachineGrid } from '../instruments/drumMachine/drumMachineRows';
import { machineTypeToInstrument } from '../instruments/drumMachine/patternToRecording';
import { awardRecordingPractice } from '../profile/awardPlayAlong';
import { persistRecordingAudio } from '../storage/recordingAudioStorage';
import { saveRecording } from '../storage/recordingsStorage';
import {
  deleteDrumMachineTake,
  importDrumMachinePattern,
  loadDrumMachinePatterns,
  saveDrumMachinePattern,
  syncDrumMachinePatternsToRecordings,
  type DrumMachinePattern,
} from '../storage/drumMachinePatternsStorage';
import {
  loadDrumMachineSong,
  saveDrumMachineSong,
  SONG_REPEAT_OPTIONS,
  type DrumMachineSongEntry,
} from '../storage/drumMachineSongStorage';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';
import {
  pickDrumMachinePatternFile,
  shareDrumMachinePattern,
} from '../utils/patternShare';
import { recordFeatureUse } from '../storage/profileProgressStorage';

const DICE_ICON: keyof typeof Ionicons.glyphMap =
  'dice' in Ionicons.glyphMap ? 'dice' : 'shuffle';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'DrumMachine'>;

export function DrumMachineScreen({ navigation }: Props) {
  // Counted once per visit — the question is whether people find this
  // screen at all, not how long they stay.
  useEffect(() => {
    void recordFeatureUse('drumMachineOpened');
  }, []);

  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isPortrait } = usePianoOrientation(navigation);
  const {
    settingsReady,
    machineType,
    setMachineType,
    bank,
    grid,
    bpm,
    playing,
    stepStore,
    countdown,
    stepCount,
    setStepCount,
    togglePlay,
    stop,
    nudgeBpm,
    tapTempo,
    toggleCell,
    previewRow,
    clearGrid,
    randomizeGrid,
    loadPattern,
    mutedRows,
    toggleMuteRow,
    liveRecord,
    toggleLiveRecord,
    previewOnToggle,
    setPreviewOnToggle,
    saveLoops,
    setSaveLoops,
    swing,
    setSwing,
    metronomeOn,
    setMetronomeOn,
    countInOn,
    setCountInOn,
    hapticsOn,
    setHapticsOn,
    drumKitId,
    setDrumKitId,
    resetSettings,
    playSongChain,
    songEntryIndex,
  } = useDrumMachine();
  const { ready } = useDrumMachineEngine(machineType, drumKitId);
  const accent = bank.theme.accent;

  const [patterns, setPatterns] = useState<DrumMachinePattern[]>([]);
  const [loadOpen, setLoadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [recordModeOpen, setRecordModeOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'clear' | 'randomize' | null>(
    null,
  );

  // Microphone take of the running loop — saved into Kayıtlarım on stop.
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [micRecording, setMicRecording] = useState(false);
  const micStartRef = useRef(0);
  const micRecordingRef = useRef(false);
  micRecordingRef.current = micRecording;

  const startMicRecording = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert(t('recording.permissionDenied'));
      return;
    }
    // Overdub mode (mixWithOthers): the sequencer loop must keep sounding
    // while the mic records — plain recording mode would duck/stop it.
    await prepareOverdubRecordingAudioMode();
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    micStartRef.current = Date.now();
    setMicRecording(true);
  }, [audioRecorder, t]);

  const stopMicRecording = useCallback(
    async (silent = false) => {
      if (!micRecordingRef.current) {
        return;
      }
      setMicRecording(false);
      const durationMs = Date.now() - micStartRef.current;
      await audioRecorder.stop();
      await restorePlaybackAudioMode();
      const instrument = machineTypeToInstrument(machineType);
      const recordingId = `${Date.now()}`;
      const sourceUri = audioRecorder.uri;
      await saveRecording({
        id: recordingId,
        createdAt: Date.now(),
        instrument,
        mode: 'microphone',
        durationMs,
        // The recorder writes into the OS cache, which gets purged — keep the
        // take in Documents instead.
        audioUri: sourceUri ? persistRecordingAudio(recordingId, sourceUri) : undefined,
        title: t('drumMachine.micTakeTitle'),
      });
      void awardRecordingPractice(instrument, durationMs);
      if (!silent) {
        Alert.alert(t('drumMachine.micSaved'));
      }
    },
    [audioRecorder, machineType, t],
  );

  // Leaving the screen while the mic runs: finish and keep the take. The
  // recorder may already be torn down on unmount — never let that throw.
  useEffect(() => {
    return () => {
      stopMicRecording(true).catch(() => {});
    };
  }, [stopMicRecording]);

  const handleRecordPress = () => {
    if (micRecording) {
      void stopMicRecording();
      return;
    }
    if (liveRecord) {
      toggleLiveRecord();
      return;
    }
    setRecordModeOpen(true);
  };

  const handleSelectRecordMode = (key: string) => {
    setRecordModeOpen(false);
    if (key === 'mic') {
      void startMicRecording();
    } else {
      toggleLiveRecord();
    }
  };

  const refreshPatterns = useCallback(async () => {
    await syncDrumMachinePatternsToRecordings();
    setPatterns(await loadDrumMachinePatterns());
  }, []);

  useEffect(() => {
    void refreshPatterns();
  }, [refreshPatterns]);

  const handleBack = () => {
    stop();
    navigation.goBack();
  };

  const gridHasHits = useMemo(
    () => grid.some((row) => row.some((cell) => cell > 0)),
    [grid],
  );

  // Identity of the grid the dice last produced. Anything else on screen was
  // built, loaded or edited by hand and is worth a question before it goes.
  const rolledGridRef = useRef<DrumMachineGrid | null>(null);
  const pendingRollRef = useRef(false);

  useEffect(() => {
    if (pendingRollRef.current) {
      pendingRollRef.current = false;
      rolledGridRef.current = grid;
    }
  }, [grid]);

  const rollRandomGrid = () => {
    pendingRollRef.current = true;
    randomizeGrid();
  };

  const handleRandomize = () => {
    // Re-rolling stays a single tap: the dice is an audition tool, and a modal
    // between every roll would kill the only way to use it.
    if (!gridHasHits || grid === rolledGridRef.current) {
      rollRandomGrid();
      return;
    }
    setConfirmAction('randomize');
  };

  const handleClear = () => {
    // An already-empty grid has nothing to lose — Clear still resets the row
    // mutes, so it runs, it just does not ask.
    if (!gridHasHits) {
      clearGrid();
      return;
    }
    setConfirmAction('clear');
  };

  const runConfirmedAction = () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === 'randomize') {
      rollRandomGrid();
      return;
    }
    if (action === 'clear') {
      clearGrid();
    }
  };

  const confirmCopy =
    confirmAction === 'randomize'
      ? {
          confirmLabel: t('drumMachine.random'),
          icon: DICE_ICON,
          message: t('drumMachine.randomConfirmBody'),
          title: t('drumMachine.randomConfirmTitle'),
        }
      : {
          confirmLabel: t('drumMachine.clear'),
          icon: 'trash-outline' as const,
          message: t('drumMachine.clearConfirmBody'),
          title: t('drumMachine.clearConfirmTitle'),
        };

  const handleSave = () => {
    stop();
    setNameDraft(t('drumMachine.defaultPatternName'));
    setNaming(true);
  };

  const confirmSave = async () => {
    const title = nameDraft.trim();
    if (!title) return;
    await saveDrumMachinePattern({
      title,
      bpm,
      grid,
      machineType,
      loops: saveLoops,
      drumKitId,
    });
    setNaming(false);
    await refreshPatterns();
  };

  const handleLoadSelect = (pattern: DrumMachinePattern) => {
    loadPattern(pattern);
    setLoadOpen(false);
  };

  const handlePresetSelect = (preset: DrumMachinePreset) => {
    loadPattern({
      id: preset.id,
      title: t(preset.labelKey),
      bpm: preset.bpm,
      machineType: preset.machineType,
      grid: preset.grid,
      createdAt: Date.now(),
    });
    setLoadOpen(false);
  };

  const handleShare = (pattern: DrumMachinePattern) => {
    void shareDrumMachinePattern(pattern, t('drumMachine.shareTitle')).then(
      (shared) => {
        if (!shared) {
          Alert.alert(t('recordings.shareUnavailable'));
        }
      },
    );
  };

  const handleImport = async () => {
    const picked = await pickDrumMachinePatternFile();
    if (!picked.ok) {
      if (picked.code !== 'canceled') {
        Alert.alert(t('drumMachine.importError'));
      }
      return;
    }
    const imported = await importDrumMachinePattern(picked.payload);
    if (!imported) {
      Alert.alert(t('drumMachine.importError'));
      return;
    }
    await refreshPatterns();
    loadPattern(imported);
    setLoadOpen(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('drumMachine.deletePattern'), t('drumMachine.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void deleteDrumMachineTake(id).then(refreshPatterns);
        },
      },
    ]);
  };

  const handleSelectType = (typeId: DrumMachineTypeId) => {
    setMachineType(typeId);
  };

  const engineReady = settingsReady && ready;

  // ---- Song mode: an ordered, persisted chain of patterns/presets. ----
  const [songOpen, setSongOpen] = useState(false);
  const [songEntries, setSongEntries] = useState<DrumMachineSongEntry[]>([]);
  const [pendingSongPlay, setPendingSongPlay] = useState(false);
  const songLoadedRef = useRef(false);

  useEffect(() => {
    void loadDrumMachineSong().then((entries) => {
      setSongEntries(entries);
      songLoadedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (songLoadedRef.current) {
      void saveDrumMachineSong(songEntries);
    }
  }, [songEntries]);

  const findChainPattern = useCallback(
    (patternId: string): DrumMachinePattern | null => {
      const saved = patterns.find((pattern) => pattern.id === patternId);
      if (saved) {
        return saved;
      }
      const preset = DRUM_MACHINE_PRESETS.find((entry) => entry.id === patternId);
      if (preset) {
        return {
          id: preset.id,
          title: t(preset.labelKey),
          bpm: preset.bpm,
          machineType: preset.machineType,
          grid: preset.grid,
          createdAt: 0,
        };
      }
      return null;
    },
    [patterns, t],
  );

  // Entries whose pattern was deleted silently drop out of the chain view.
  const resolvedSong = useMemo<ResolvedSongEntry[]>(
    () =>
      songEntries
        .map((entry) => {
          const pattern = findChainPattern(entry.patternId);
          return pattern ? { entry, pattern } : null;
        })
        .filter((item): item is ResolvedSongEntry => item !== null),
    [findChainPattern, songEntries],
  );

  const songPlaying = playing && songEntryIndex !== null;

  const handleSongAdd = (patternId: string) => {
    const pattern = findChainPattern(patternId);
    if (!pattern) {
      return;
    }
    const chainType = resolvedSong[0]?.pattern.machineType;
    if (chainType && pattern.machineType !== chainType) {
      Alert.alert(t('drumMachine.songTypeMismatch'));
      return;
    }
    setSongEntries((prev) => [...prev, { patternId, repeats: 2 }]);
  };

  const handleSongCycleRepeats = (index: number) => {
    setSongEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) {
          return entry;
        }
        const at = SONG_REPEAT_OPTIONS.indexOf(entry.repeats);
        const next = SONG_REPEAT_OPTIONS[(at + 1) % SONG_REPEAT_OPTIONS.length];
        return { ...entry, repeats: next };
      }),
    );
  };

  const handleSongMove = (index: number, direction: -1 | 1) => {
    setSongEntries((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSongRemove = (index: number) => {
    setSongEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSongClear = () => {
    if (songPlaying) {
      stop();
    }
    setSongEntries([]);
  };

  const startSongPlayback = useCallback(() => {
    const chain: SongChainEntry[] = resolvedSong.map(({ entry, pattern }) => ({
      pattern,
      repeats: entry.repeats,
    }));
    playSongChain(chain);
  }, [playSongChain, resolvedSong]);

  const handleSongPlayStop = () => {
    if (songPlaying) {
      stop();
      return;
    }
    const chainType = resolvedSong[0]?.pattern.machineType;
    if (!chainType) {
      return;
    }
    setSongOpen(false);
    if (chainType !== machineType) {
      // Chain lives on another bank — switch and start once its engine is up.
      setMachineType(chainType);
      setPendingSongPlay(true);
      return;
    }
    startSongPlayback();
  };

  useEffect(() => {
    if (pendingSongPlay && engineReady) {
      setPendingSongPlay(false);
      startSongPlayback();
    }
  }, [engineReady, pendingSongPlay, startSongPlayback]);

  // A bank switch queued a song start — leaving the screen cancels it so the
  // song doesn't surprise-start on the next visit.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setPendingSongPlay(false);
      };
    }, []),
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bank.theme.stageBg,
          paddingTop: Math.max(insets.top, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingLeft: Math.max(insets.left, 10),
          paddingRight: Math.max(insets.right, 10),
        },
      ]}
    >
      <View style={styles.toolbar}>
        <IconBtn
          accent={accent}
          icon="chevron-back"
          label={t('common.back')}
          onPress={handleBack}
        />
        <IconBtn
          accent={accent}
          icon={DICE_ICON}
          label={t('drumMachine.random')}
          onPress={handleRandomize}
          disabled={!engineReady}
        />
        <IconBtn
          accent={micRecording || liveRecord ? '#FF5252' : accent}
          icon={micRecording ? 'stop-circle-outline' : 'radio-button-on'}
          label={t('drumMachine.recordTitle')}
          onPress={handleRecordPress}
          disabled={!engineReady}
        />
        <IconBtn
          accent={accent}
          icon="albums-outline"
          label={t('drumMachine.songTitle')}
          onPress={() => setSongOpen(true)}
          disabled={!engineReady}
        />
        <LabeledToolbarBtn
          accentColor={accent}
          icon={playing ? 'stop' : 'play'}
          label={playing ? t('drumMachine.stop') : t('drumMachine.start')}
          onPress={togglePlay}
          filled
          disabled={!engineReady && !playing}
        />
        <Text style={[styles.title, { color: accent }]} numberOfLines={1}>
          {t('drumMachine.title')}
        </Text>
        <IconBtn
          accent={accent}
          icon="musical-notes-outline"
          label={t('drumMachine.type')}
          onPress={() => {
            stop();
            setTypeOpen(true);
          }}
        />
        <IconBtn
          accent={accent}
          icon="settings-outline"
          label={t('drumMachine.settings')}
          onPress={() => setSettingsOpen(true)}
        />
      </View>

      <View style={styles.stage}>
        {!engineReady ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accent} size="large" />
            <Text style={styles.loadingText}>{t('drumMachine.loading')}</Text>
          </View>
        ) : (
          <StepSequencerGrid
            rows={bank.rows}
            theme={bank.theme}
            grid={grid}
            stepStore={stepStore}
            mutedRows={mutedRows}
            onToggleCell={toggleCell}
            onPreviewRow={previewRow}
            onToggleMuteRow={toggleMuteRow}
          />
        )}
        {countdown !== null ? (
          <View pointerEvents="none" style={styles.countInOverlay}>
            <Text style={[styles.countInText, { color: accent }]}>{countdown}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <FooterBtn
          accent={accent}
          icon="save-outline"
          label={t('drumMachine.save')}
          onPress={handleSave}
          variant="primary"
        />
        <FooterBtn
          accent={accent}
          icon="folder-open-outline"
          label={t('drumMachine.load')}
          onPress={() => {
            stop();
            void refreshPatterns().then(() => setLoadOpen(true));
          }}
          variant="tinted"
        />
        <FooterBtn
          accent={accent}
          icon="trash-outline"
          label={t('drumMachine.clear')}
          onPress={handleClear}
          variant="plain"
        />
        <View style={[styles.bpmWrap, { borderColor: accent }]}>
          <BpmHoldButton
            accent={accent}
            icon="remove"
            accessibilityLabel={t('drumMachine.bpmDown')}
            onNudge={() => nudgeBpm(-1)}
          />
          <Pressable
            accessibilityLabel={t('drumMachine.tapTempo')}
            onPress={tapTempo}
          >
            <Text style={[styles.bpmText, { color: accent }]}>
              {t('drumMachine.bpm', { value: bpm })}
            </Text>
          </Pressable>
          <BpmHoldButton
            accent={accent}
            icon="add"
            accessibilityLabel={t('drumMachine.bpmUp')}
            onNudge={() => nudgeBpm(1)}
          />
        </View>
      </View>

      {naming ? (
        <SavePatternDialog
          accent={accent}
          name={nameDraft}
          onChangeName={setNameDraft}
          onCancel={() => setNaming(false)}
          onConfirm={() => void confirmSave()}
        />
      ) : null}

      <LoadPatternModal
        visible={loadOpen}
        accent={accent}
        patterns={patterns}
        onClose={() => setLoadOpen(false)}
        onSelect={handleLoadSelect}
        onSelectPreset={handlePresetSelect}
        onShare={handleShare}
        onImport={() => void handleImport()}
        onDelete={handleDelete}
      />

      <SongModeModal
        visible={songOpen}
        accent={accent}
        entries={resolvedSong}
        patterns={patterns}
        songPlaying={songPlaying}
        activeIndex={songEntryIndex}
        onClose={() => setSongOpen(false)}
        onAdd={handleSongAdd}
        onCycleRepeats={handleSongCycleRepeats}
        onMove={handleSongMove}
        onRemove={handleSongRemove}
        onClear={handleSongClear}
        onPlayStop={handleSongPlayStop}
      />

      <MachineTypeModal
        visible={typeOpen}
        machineType={machineType}
        onClose={() => setTypeOpen(false)}
        onSelectType={handleSelectType}
      />

      <DrumMachineSettingsModal
        visible={settingsOpen}
        accent={accent}
        showKit={machineType === 'drums'}
        previewOnToggle={previewOnToggle}
        saveLoops={saveLoops}
        swing={swing}
        stepCount={stepCount}
        metronomeOn={metronomeOn}
        countInOn={countInOn}
        hapticsOn={hapticsOn}
        drumKitId={drumKitId}
        onClose={() => setSettingsOpen(false)}
        onSetPreviewOnToggle={setPreviewOnToggle}
        onSetSaveLoops={setSaveLoops}
        onSetSwing={setSwing}
        onSetStepCount={setStepCount}
        onSetMetronomeOn={setMetronomeOn}
        onSetCountInOn={setCountInOn}
        onSetHapticsOn={setHapticsOn}
        onSetDrumKitId={setDrumKitId}
        onResetDefaults={resetSettings}
      />

      <ConfirmDeleteModal
        visible={confirmAction !== null}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.confirmLabel}
        cancelLabel={t('common.cancel')}
        icon={confirmCopy.icon}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
      />

      <OptionListModal
        visible={recordModeOpen}
        title={t('drumMachine.recordTitle')}
        message={t('drumMachine.recordHint')}
        options={[
          { key: 'mic', label: t('drumMachine.recordMic'), icon: 'mic' },
          { key: 'live', label: t('drumMachine.recordLive'), icon: 'grid' },
        ]}
        onSelect={handleSelectRecordMode}
        onClose={() => setRecordModeOpen(false)}
      />

      <LandscapeOverlay visible={isPortrait} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  stage: {
    flex: 1,
    minHeight: 0,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  countInOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    justifyContent: 'center',
  },
  countInText: {
    fontSize: 96,
    fontWeight: '800',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  bpmWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    marginLeft: 'auto',
    paddingHorizontal: 4,
  },
  bpmText: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'center',
  },
});
