import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
import { DrumMachineSettingsModal } from '../components/drumMachine/DrumMachineSettingsModal';
import { LoadPatternModal } from '../components/drumMachine/LoadPatternModal';
import { MachineTypeModal } from '../components/drumMachine/MachineTypeModal';
import {
  SongModeModal,
  type ResolvedSongEntry,
} from '../components/drumMachine/SongModeModal';
import { StepSequencerGrid } from '../components/drumMachine/StepSequencerGrid';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { OptionListModal } from '../components/studio/OptionListModal';
import { useDrumMachine, type SongChainEntry } from '../hooks/useDrumMachine';
import { useDrumMachineEngine } from '../hooks/useDrumMachineEngine';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import type { DrumMachineTypeId } from '../instruments/drumMachine/drumMachineBanks';
import {
  DRUM_MACHINE_PRESETS,
  type DrumMachinePreset,
} from '../instruments/drumMachine/drumMachinePresets';
import { machineTypeToInstrument } from '../instruments/drumMachine/patternToRecording';
import { awardRecordingPractice } from '../profile/awardPlayAlong';
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

const DICE_ICON: keyof typeof Ionicons.glyphMap =
  'dice' in Ionicons.glyphMap ? 'dice' : 'shuffle';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'DrumMachine'>;

export function DrumMachineScreen({ navigation }: Props) {
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
    currentStep,
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
      await saveRecording({
        id: `${Date.now()}`,
        createdAt: Date.now(),
        instrument,
        mode: 'microphone',
        durationMs,
        audioUri: audioRecorder.uri ?? undefined,
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
          onPress={() => randomizeGrid()}
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
            currentStep={currentStep}
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
          onPress={clearGrid}
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
        <Pressable onPress={() => setNaming(false)} style={styles.nameOverlay}>
          <Pressable
            onPress={() => {}}
            style={[styles.nameCard, { borderColor: accent }]}
          >
            <Text style={styles.nameTitle}>{t('drumMachine.saveTitle')}</Text>
            <TextInput
              autoFocus
              placeholder={t('drumMachine.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.nameInput, { borderColor: accent }]}
              value={nameDraft}
              onChangeText={setNameDraft}
              maxLength={40}
            />
            <View style={styles.nameActions}>
              <Pressable onPress={() => setNaming(false)} style={styles.nameBtn}>
                <Text style={styles.nameBtnText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                disabled={!nameDraft.trim()}
                onPress={() => void confirmSave()}
                style={[
                  styles.nameBtn,
                  styles.nameBtnPrimary,
                  { backgroundColor: accent },
                  !nameDraft.trim() && styles.nameBtnDisabled,
                ]}
              >
                <Text style={[styles.nameBtnText, styles.nameBtnPrimaryText]}>
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
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

function IconBtn({
  icon,
  label,
  onPress,
  accent,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        { borderColor: accent },
        disabled && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
    >
      <Ionicons color={accent} name={icon} size={20} />
    </Pressable>
  );
}

function LabeledToolbarBtn({
  icon,
  label,
  onPress,
  accentColor,
  filled,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accentColor: string;
  filled?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.labeledBtn,
        {
          borderColor: accentColor,
          backgroundColor: filled ? accentColor : colors.surface,
        },
        disabled && styles.labeledBtnDisabled,
      ]}
    >
      <Ionicons color={filled ? '#FFFFFF' : accentColor} name={icon} size={18} />
      <Text
        style={[
          styles.labeledBtnText,
          { color: filled ? '#FFFFFF' : accentColor },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type FooterBtnVariant = 'primary' | 'tinted' | 'plain';

function FooterBtn({
  icon,
  label,
  onPress,
  accent,
  variant = 'tinted',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent: string;
  variant?: FooterBtnVariant;
}) {
  const contentColor =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'tinted'
        ? accent
        : colors.textSecondary;
  const boxStyle =
    variant === 'primary'
      ? { backgroundColor: accent, borderColor: accent }
      : variant === 'tinted'
        ? { backgroundColor: `${accent}1F`, borderColor: `${accent}66` }
        : { backgroundColor: colors.surface, borderColor: colors.border };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.footerBtn,
        boxStyle,
        variant === 'primary' && styles.footerBtnPrimary,
        pressed && styles.footerBtnPressed,
      ]}
    >
      <Ionicons color={contentColor} name={icon} size={16} />
      <Text style={[styles.footerBtnText, { color: contentColor }]}>{label}</Text>
    </Pressable>
  );
}

const BPM_HOLD_DELAY_MS = 320;
const BPM_HOLD_INTERVAL_MS = 70;

function BpmHoldButton({
  icon,
  accessibilityLabel,
  onNudge,
  accent,
}: {
  icon: 'add' | 'remove';
  accessibilityLabel: string;
  onNudge: () => void;
  accent: string;
}) {
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHold = useCallback(() => {
    if (delayRef.current) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  const startHold = useCallback(() => {
    clearHold();
    onNudge();
    delayRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onNudge();
      }, BPM_HOLD_INTERVAL_MS);
    }, BPM_HOLD_DELAY_MS);
  }, [clearHold, onNudge]);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPressIn={startHold}
      onPressOut={clearHold}
      style={styles.bpmBtn}
    >
      <Ionicons color={accent} name={icon} size={18} />
    </Pressable>
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
  iconBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  labeledBtn: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 4,
    height: 40,
    paddingHorizontal: 10,
  },
  labeledBtnDisabled: {
    opacity: 0.45,
  },
  labeledBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.7,
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
    ...StyleSheet.absoluteFillObject,
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
  footerBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  footerBtnPrimary: {
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  footerBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  footerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
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
  bpmBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  bpmText: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'center',
  },
  nameOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
    zIndex: 20,
  },
  nameCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    width: '100%',
  },
  nameTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  nameInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1.5,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nameActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  nameBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nameBtnPrimary: {
    borderRadius: 8,
  },
  nameBtnDisabled: {
    opacity: 0.45,
  },
  nameBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  nameBtnPrimaryText: {
    color: '#FFFFFF',
  },
});
