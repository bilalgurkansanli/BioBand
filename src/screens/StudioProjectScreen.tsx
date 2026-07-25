import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ExportProgressModal } from '../components/recordings/ExportProgressModal';
import { ScreenContainer } from '../components/ScreenContainer';
import { AddTrackModal } from '../components/studio/AddTrackModal';
import { OptionListModal } from '../components/studio/OptionListModal';
import { PickTakeModal } from '../components/studio/PickTakeModal';
import { StudioSettingsModal, type SnapDivision } from '../components/studio/StudioSettingsModal';
import { StudioToast } from '../components/studio/StudioToast';
import { TextPromptModal } from '../components/studio/TextPromptModal';
import { TrackSettingsModal } from '../components/studio/TrackSettingsModal';
import { StudioTimeline } from '../components/studio/timeline/StudioTimeline';
import {
  DEFAULT_ZOOM_INDEX,
  MIN_TIMELINE_MS,
  TRAIL_MS,
  ZOOM_LEVELS,
  pxPerMsFor,
} from '../components/studio/timeline/timelineGeometry';
import { useRecordingActions } from '../hooks/useRecordingActions';
import { useRecordingPlayback } from '../hooks/useRecordingPlayback';
import { useRecordings } from '../hooks/useRecordings';
import { useStudioPlayback } from '../hooks/useStudioPlayback';
import { useStudioProject } from '../hooks/useStudioProject';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { deleteStudioProject } from '../storage/studioProjectsStorage';
import {
  clearStudioOverdubSession,
  instrumentRouteFor,
  startStudioOverdubSession,
} from '../studio/studioOverdubSession';
import {
  consumeStudioTrackAdded,
  subscribeStudioTrackAdded,
} from '../studio/studioTrackAddedSignal';
import { startMetronome, stopMetronome } from '../instruments/piano/pianoMetronome';
import { colors } from '../theme/colors';
import type { InstrumentId, RecordingMode } from '../types/recording';
import type { RecordingsStackParamList } from '../types/navigation';
import {
  bpmToRate,
  getProjectBpm,
  getProjectDurationMs,
  MAX_BPM,
  MIN_BPM,
  type StudioTrack,
} from '../types/studio';
import { formatDuration } from '../utils/formatDuration';
import { voicePatch } from '../utils/instrumentVoices';
import { INSTRUMENT_ICONS, INSTRUMENT_TITLE_KEYS } from '../utils/recordingLabels';

type Props = NativeStackScreenProps<RecordingsStackParamList, 'StudioProject'>;

const INSTRUMENTS: InstrumentId[] = ['piano', 'drums', 'guitar', 'violin', 'pads'];

export function StudioProjectScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const { t } = useTranslation();
  const { isPortrait } = usePianoOrientation(navigation);
  const {
    project,
    loading,
    rename,
    importTake,
    patchTrack,
    deleteTrack,
    duplicate,
    refresh,
    setBpm,
  } = useStudioProject(projectId);
  const { recordings } = useRecordings();
  const {
    play,
    stop,
    seek,
    isPlaying,
    loading: playLoading,
    playingProjectId,
    positionMs,
  } = useStudioPlayback();
  const {
    playingId: playingTrackId,
    play: playTrack,
    stop: stopTrackPlayback,
  } = useRecordingPlayback();
  const {
    job: exportJob,
    cancel: cancelExport,
    share: shareTrack,
    download: downloadTrack,
  } = useRecordingActions();

  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [pickTakeVisible, setPickTakeVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [addTrackVisible, setAddTrackVisible] = useState(false);
  const [deleteProjectVisible, setDeleteProjectVisible] = useState(false);
  const [overdubInstrumentVisible, setOverdubInstrumentVisible] = useState(false);
  const [overdubModeInstrument, setOverdubModeInstrument] = useState<InstrumentId | null>(null);
  const [trackDeleteTarget, setTrackDeleteTarget] = useState<StudioTrack | null>(null);
  // Store only the id — the track object is re-derived from the project each
  // render, so edits (voice, volume…) are reflected in the open modal instead
  // of it holding a stale snapshot.
  const [clipMenuTrackId, setClipMenuTrackId] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapDivision, setSnapDivision] = useState<SnapDivision>(4);
  const modalHandoffTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (modalHandoffTimeoutRef.current) {
        clearTimeout(modalHandoffTimeoutRef.current);
      }
    };
  }, []);

  // Show a themed toast when an overdub take lands here — the signal fires just
  // before navigating back, so consume it on focus (and live while mounted).
  useFocusEffect(
    useCallback(() => {
      if (consumeStudioTrackAdded()) {
        setToastVisible(true);
      }
    }, []),
  );

  useEffect(() => {
    return subscribeStudioTrackAdded(() => {
      if (consumeStudioTrackAdded()) {
        setToastVisible(true);
      }
    });
  }, []);

  // Open the next modal after this one has fully closed — opening both native
  // Modals in the same tick can leave the new one's backdrop unable to receive
  // touches on Android until the previous one finishes dismissing.
  const scheduleModalHandoff = (fn: () => void) => {
    if (modalHandoffTimeoutRef.current) {
      clearTimeout(modalHandoffTimeoutRef.current);
    }
    modalHandoffTimeoutRef.current = setTimeout(() => {
      modalHandoffTimeoutRef.current = null;
      fn();
    }, 300);
  };

  const playingThis = isPlaying && playingProjectId === projectId;
  const projectDurationMs = project ? getProjectDurationMs(project) : 0;
  const bpm = project ? getProjectBpm(project) : 120;
  const rate = bpmToRate(bpm);
  const beatMs = 60000 / bpm;
  const snapMs = snapEnabled ? beatMs * (4 / snapDivision) : 10;

  // Latest values for the hold-to-repeat BPM buttons and the tempo restart.
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const positionRef = useRef(positionMs);
  positionRef.current = positionMs;

  // The grid/snap follow the tempo instantly, but re-scheduling audio is
  // expensive — so the metronome and the mid-playback restart wait until the
  // tempo settles (holding +/- would otherwise restart playback every step).
  const [settledBpm, setSettledBpm] = useState(bpm);
  useEffect(() => {
    const timer = setTimeout(() => setSettledBpm(bpm), 250);
    return () => clearTimeout(timer);
  }, [bpm]);
  const settledRate = bpmToRate(settledBpm);
  const appliedRateRef = useRef(rate);

  // Run the metronome (a lookahead audio-clock click) alongside mix playback.
  useEffect(() => {
    if (playingThis && metronomeEnabled) {
      startMetronome(settledBpm);
      return () => stopMetronome();
    }
    stopMetronome();
    return undefined;
  }, [playingThis, metronomeEnabled, settledBpm]);

  // Changing the tempo mid-playback re-schedules the mix from the playhead so
  // the new speed takes effect without having to stop and start again.
  useEffect(() => {
    if (!playingThis || !project) {
      appliedRateRef.current = settledRate;
      return;
    }
    if (appliedRateRef.current === settledRate) {
      return;
    }
    appliedRateRef.current = settledRate;
    const from = positionRef.current;
    stop(false);
    void play(project, { startAtMs: from, loop: loopEnabled, rate: settledRate });
  }, [settledRate, playingThis, project, loopEnabled, play, stop]);

  const bpmRepeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bpmDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopBpmRepeat = () => {
    if (bpmDelayRef.current) {
      clearTimeout(bpmDelayRef.current);
      bpmDelayRef.current = null;
    }
    if (bpmRepeatRef.current) {
      clearInterval(bpmRepeatRef.current);
      bpmRepeatRef.current = null;
    }
  };

  useEffect(() => stopBpmRepeat, []);

  const applyBpmDelta = (delta: number) => {
    const next = Math.min(MAX_BPM, Math.max(MIN_BPM, bpmRef.current + delta));
    if (next === bpmRef.current) {
      return;
    }
    bpmRef.current = next;
    setBpm(next);
  };

  // Tap steps once; press-and-hold keeps stepping.
  const startBpmRepeat = (delta: number) => {
    applyBpmDelta(delta);
    stopBpmRepeat();
    bpmDelayRef.current = setTimeout(() => {
      bpmRepeatRef.current = setInterval(() => applyBpmDelta(delta), 120);
    }, 400);
  };
  const pixelsPerSecond = ZOOM_LEVELS[zoomIndex];
  const pxPerMs = pxPerMsFor(pixelsPerSecond);
  const timelineWidth =
    Math.max(MIN_TIMELINE_MS, projectDurationMs + TRAIL_MS) * pxPerMs;

  // Mixed playback and single-track preview share the same instrument engines —
  // keep them mutually exclusive.
  const stopAllPlayback = () => {
    if (playingThis) {
      // Keep the playhead where it is — editing a track shouldn't rewind.
      stop(false);
    }
    stopTrackPlayback();
  };

  const promptOverdubMode = (instrument: InstrumentId) => {
    if (!project) {
      return;
    }
    setOverdubModeInstrument(instrument);
  };

  const beginOverdub = (instrument: InstrumentId, mode: RecordingMode) => {
    if (!project) {
      return;
    }
    stopAllPlayback();
    startStudioOverdubSession({
      projectId: project.id,
      projectTitle: project.title,
      instrument,
      mode,
    });
    const parent = navigation.getParent();
    parent?.navigate('Instruments', {
      screen: instrumentRouteFor(instrument),
    });
  };

  const removeProject = () => {
    stopAllPlayback();
    clearStudioOverdubSession();
    void deleteStudioProject(projectId).then(() => navigation.goBack());
  };

  const commitClipStart = (trackId: string, startMs: number) => {
    stopAllPlayback();
    void patchTrack(trackId, { startMs });
  };

  const toggleMute = (trackId: string) => {
    const track = project?.tracks.find((entry) => entry.id === trackId);
    if (!track) {
      return;
    }
    stopAllPlayback();
    void patchTrack(trackId, { muted: !track.muted });
  };

  const toggleSolo = (trackId: string) => {
    const track = project?.tracks.find((entry) => entry.id === trackId);
    if (!track) {
      return;
    }
    stopAllPlayback();
    void patchTrack(trackId, { solo: !track.solo });
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (!project) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel={t('common.back')}
            hitSlop={8}
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
          >
            <Ionicons color={colors.text} name="chevron-back" size={24} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.meta}>{t('studio.emptyTitle')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const hasTracks = project.tracks.length > 0;
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIndex > 0;
  const clipMenuTrack =
    clipMenuTrackId === null
      ? null
      : project.tracks.find((track) => track.id === clipMenuTrackId) ?? null;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={styles.title}>
            {project.title}
          </Text>
        </View>

        {/* Transport lives on the right, away from the back button so a mishit
            can't accidentally exit while starting/stopping playback. */}
        <View style={styles.bpmGroup}>
          <Pressable
            accessibilityLabel={t('studio.bpmDown')}
            hitSlop={6}
            onPressIn={() => startBpmRepeat(-5)}
            onPressOut={stopBpmRepeat}
            style={styles.bpmStep}
          >
            <Ionicons color={colors.text} name="remove" size={16} />
          </Pressable>
          <View style={styles.bpmValueWrap}>
            <Text style={styles.bpmValue}>{bpm}</Text>
            <Text style={styles.bpmUnit}>{t('studio.bpm')}</Text>
          </View>
          <Pressable
            accessibilityLabel={t('studio.bpmUp')}
            hitSlop={6}
            onPressIn={() => startBpmRepeat(5)}
            onPressOut={stopBpmRepeat}
            style={styles.bpmStep}
          >
            <Ionicons color={colors.text} name="add" size={16} />
          </Pressable>
        </View>

        <Pressable
          accessibilityLabel={t('studio.zoomOut')}
          disabled={!canZoomOut}
          hitSlop={6}
          onPress={() => setZoomIndex((i) => Math.max(0, i - 1))}
          style={[styles.iconBtn, !canZoomOut && styles.disabled]}
        >
          <Ionicons color={colors.text} name="remove-circle-outline" size={22} />
        </Pressable>
        <Pressable
          accessibilityLabel={t('studio.zoomIn')}
          disabled={!canZoomIn}
          hitSlop={6}
          onPress={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
          style={[styles.iconBtn, !canZoomIn && styles.disabled]}
        >
          <Ionicons color={colors.text} name="add-circle-outline" size={22} />
        </Pressable>

        <Pressable
          accessibilityLabel={t('studio.addTrack')}
          hitSlop={6}
          onPress={() => setAddTrackVisible(true)}
          style={styles.addBtn}
        >
          <Ionicons color={colors.accent} name="add" size={18} />
          <Text style={styles.addBtnText}>{t('studio.addTrack')}</Text>
        </Pressable>

        <Pressable
          accessibilityLabel={t('studio.settingsTitle')}
          hitSlop={6}
          onPress={() => setSettingsVisible(true)}
          style={styles.iconBtn}
        >
          <Ionicons color={colors.text} name="settings-outline" size={20} />
        </Pressable>

        <Text style={styles.time}>
          {formatDuration(positionMs)} / {formatDuration(projectDurationMs)}
        </Text>

        <Pressable
          disabled={playLoading || !hasTracks}
          onPress={() => {
            if (playingThis) {
              stop();
            } else {
              stopTrackPlayback();
              appliedRateRef.current = rate;
              void play(project, { loop: loopEnabled, rate });
            }
          }}
          style={[styles.playBtn, playingThis && styles.playBtnActive, !hasTracks && styles.disabled]}
        >
          {playLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons color="#FFFFFF" name={playingThis ? 'stop' : 'play'} size={20} />
          )}
        </Pressable>
      </View>

      {isPortrait ? (
        <View style={styles.centered}>
          <Ionicons color={colors.textSecondary} name="phone-landscape-outline" size={40} />
          <Text style={styles.hint}>{t('studio.rotateHint')}</Text>
        </View>
      ) : hasTracks ? (
        <>
          <StudioTimeline
            bpm={bpm}
            durationMs={projectDurationMs}
            isPlaying={playingThis}
            onClipCommitStart={commitClipStart}
            onClipPress={(track) => setClipMenuTrackId(track.id)}
            onSeek={seek}
            onToggleMute={toggleMute}
            onToggleSolo={toggleSolo}
            pixelsPerSecond={pixelsPerSecond}
            positionMs={positionMs}
            pxPerMs={pxPerMs}
            showGrid={gridEnabled}
            snapMs={snapMs}
            timelineWidth={timelineWidth}
            tracks={project.tracks}
          />
          <Text style={styles.footerHint}>{t('studio.clipHint')}</Text>
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.meta}>{t('studio.timelineEmpty')}</Text>
        </View>
      )}

      <PickTakeModal
        takes={recordings.filter(
          (take) =>
            (take.mode === 'instrument' && (take.events?.length ?? 0) > 0) ||
            (take.mode === 'microphone' && !!take.audioUri),
        )}
        visible={pickTakeVisible}
        onClose={() => setPickTakeVisible(false)}
        onRecordInstead={() => {
          setPickTakeVisible(false);
          scheduleModalHandoff(() => setOverdubInstrumentVisible(true));
        }}
        onSelect={(take) => {
          setPickTakeVisible(false);
          if (playingThis) {
            stop();
          }
          void importTake(take).then(() => refresh());
        }}
      />

      <TextPromptModal
        confirmLabel={t('studio.rename')}
        initialValue={project.title}
        title={t('studio.renameTitle')}
        visible={renameVisible}
        onCancel={() => setRenameVisible(false)}
        onConfirm={(value) => {
          setRenameVisible(false);
          if (value) {
            void rename(value);
          }
        }}
      />

      <AddTrackModal
        visible={addTrackVisible}
        onClose={() => setAddTrackVisible(false)}
        onPickFromTake={() => {
          setAddTrackVisible(false);
          scheduleModalHandoff(() => setPickTakeVisible(true));
        }}
        onRecordOverdub={() => {
          setAddTrackVisible(false);
          scheduleModalHandoff(() => setOverdubInstrumentVisible(true));
        }}
      />

      <ConfirmDeleteModal
        cancelLabel={t('common.cancel')}
        confirmLabel={t('recordings.deleteConfirm')}
        message={t('studio.deleteProjectConfirm')}
        title={t('studio.deleteProject')}
        visible={deleteProjectVisible}
        onCancel={() => setDeleteProjectVisible(false)}
        onConfirm={() => {
          setDeleteProjectVisible(false);
          removeProject();
        }}
      />

      <OptionListModal
        options={INSTRUMENTS.map((instrument) => ({
          key: instrument,
          label: t(INSTRUMENT_TITLE_KEYS[instrument]),
          icon: INSTRUMENT_ICONS[instrument],
        }))}
        title={t('studio.pickInstrumentTitle')}
        visible={overdubInstrumentVisible}
        onClose={() => setOverdubInstrumentVisible(false)}
        onSelect={(key) => {
          setOverdubInstrumentVisible(false);
          scheduleModalHandoff(() => promptOverdubMode(key as InstrumentId));
        }}
      />

      <OptionListModal
        message={t('recording.chooseModeMessage')}
        options={[
          { key: 'instrument', label: t('recording.modeInstrument'), icon: 'musical-notes-outline' },
          { key: 'microphone', label: t('recording.modeMicrophone'), icon: 'mic-outline' },
        ]}
        title={t('recording.chooseModeTitle')}
        visible={overdubModeInstrument !== null}
        onClose={() => setOverdubModeInstrument(null)}
        onSelect={(key) => {
          const instrument = overdubModeInstrument;
          setOverdubModeInstrument(null);
          if (instrument) {
            beginOverdub(instrument, key as RecordingMode);
          }
        }}
      />

      <TrackSettingsModal
        isPreviewPlaying={playingTrackId === clipMenuTrack?.id}
        track={clipMenuTrack}
        visible={clipMenuTrack !== null}
        onClose={() => setClipMenuTrackId(null)}
        onCommitVolume={(volume) => {
          if (!clipMenuTrack) {
            return;
          }
          stopAllPlayback();
          void patchTrack(clipMenuTrack.id, { volume });
        }}
        onSelectVoice={(voiceId) => {
          if (!clipMenuTrack) {
            return;
          }
          stopAllPlayback();
          void patchTrack(clipMenuTrack.id, voicePatch(clipMenuTrack.instrument, voiceId));
        }}
        onTogglePlay={() => {
          const track = clipMenuTrack;
          if (!track) {
            return;
          }
          if (playingTrackId === track.id) {
            stopTrackPlayback();
          } else {
            if (playingThis) {
              stop();
            }
            void playTrack(track);
          }
        }}
        onShare={() => {
          const track = clipMenuTrack;
          setClipMenuTrackId(null);
          if (track) {
            scheduleModalHandoff(() => void shareTrack(track));
          }
        }}
        onDownload={() => {
          const track = clipMenuTrack;
          setClipMenuTrackId(null);
          if (track) {
            scheduleModalHandoff(() => void downloadTrack(track));
          }
        }}
        onDuplicate={() => {
          const track = clipMenuTrack;
          setClipMenuTrackId(null);
          if (track) {
            stopAllPlayback();
            void duplicate(track.id);
          }
        }}
        onDelete={() => {
          const track = clipMenuTrack;
          setClipMenuTrackId(null);
          if (track) {
            scheduleModalHandoff(() => setTrackDeleteTarget(track));
          }
        }}
      />

      <ConfirmDeleteModal
        cancelLabel={t('common.cancel')}
        confirmLabel={t('recordings.deleteConfirm')}
        message={t('studio.trackDeleteConfirm')}
        title={t('studio.trackDelete')}
        visible={trackDeleteTarget !== null}
        onCancel={() => setTrackDeleteTarget(null)}
        onConfirm={() => {
          if (trackDeleteTarget) {
            stopAllPlayback();
            void deleteTrack(trackDeleteTarget.id);
          }
          setTrackDeleteTarget(null);
        }}
      />

      <ExportProgressModal job={exportJob} onCancel={cancelExport} />

      <StudioSettingsModal
        grid={gridEnabled}
        loop={loopEnabled}
        metronome={metronomeEnabled}
        snap={snapEnabled}
        snapDivision={snapDivision}
        visible={settingsVisible}
        onChangeSnapDivision={setSnapDivision}
        onClose={() => setSettingsVisible(false)}
        onDelete={() => {
          setSettingsVisible(false);
          scheduleModalHandoff(() => setDeleteProjectVisible(true));
        }}
        onRename={() => {
          setSettingsVisible(false);
          scheduleModalHandoff(() => setRenameVisible(true));
        }}
        onToggleGrid={setGridEnabled}
        onToggleLoop={setLoopEnabled}
        onToggleMetronome={setMetronomeEnabled}
        onToggleSnap={setSnapEnabled}
      />

      <StudioToast
        message={t('studio.overdubSaved')}
        onHide={() => setToastVisible(false)}
        visible={toastVisible}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  iconBtn: {
    padding: 4,
  },
  backBtn: {
    padding: 4,
    marginRight: 2,
  },
  titleWrap: {
    flex: 1,
    marginHorizontal: 4,
  },
  bpmGroup: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  bpmStep: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 7,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  bpmValueWrap: {
    alignItems: 'center',
    minWidth: 40,
  },
  bpmValue: {
    color: colors.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 16,
  },
  bpmUnit: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  time: {
    color: colors.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    minWidth: 84,
  },
  playBtn: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 44,
  },
  playBtnActive: {
    backgroundColor: colors.error,
  },
  addBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  footerHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
