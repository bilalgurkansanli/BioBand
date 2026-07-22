import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ScreenContainer } from '../components/ScreenContainer';
import { AddTrackModal } from '../components/studio/AddTrackModal';
import { OptionListModal } from '../components/studio/OptionListModal';
import { PickTakeModal } from '../components/studio/PickTakeModal';
import { StudioTrackRow } from '../components/studio/StudioTrackRow';
import { TextPromptModal } from '../components/studio/TextPromptModal';
import { useRecordingActions, type ExportFormatChoice } from '../hooks/useRecordingActions';
import { useRecordingPlayback } from '../hooks/useRecordingPlayback';
import { useRecordings } from '../hooks/useRecordings';
import { useStudioPlayback } from '../hooks/useStudioPlayback';
import { useStudioProject } from '../hooks/useStudioProject';
import { deleteStudioProject } from '../storage/studioProjectsStorage';
import {
  clearStudioOverdubSession,
  instrumentRouteFor,
  startStudioOverdubSession,
} from '../studio/studioOverdubSession';
import { colors } from '../theme/colors';
import type { InstrumentId, RecordingMode } from '../types/recording';
import type { RecordingsStackParamList } from '../types/navigation';
import { getProjectDurationMs, type StudioTrack } from '../types/studio';
import { formatDuration } from '../utils/formatDuration';
import { canExportAudioFormat } from '../utils/recordingExport';
import { INSTRUMENT_ICONS, INSTRUMENT_TITLE_KEYS } from '../utils/recordingLabels';

type Props = NativeStackScreenProps<RecordingsStackParamList, 'StudioProject'>;
type TrackExportAction = 'share' | 'download';

const INSTRUMENTS: InstrumentId[] = ['piano', 'drums', 'guitar', 'violin', 'pads'];

export function StudioProjectScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const { t } = useTranslation();
  const { project, loading, rename, importTake, patchTrack, deleteTrack, refresh } =
    useStudioProject(projectId);
  const { recordings } = useRecordings();
  const { play, stop, isPlaying, loading: playLoading, playingProjectId } =
    useStudioPlayback();
  const {
    playingId: playingTrackId,
    loadingId: loadingTrackId,
    positionMs: trackPositionMs,
    durationMs: trackDurationMs,
    play: playTrack,
    stop: stopTrackPlayback,
    seek: seekTrack,
  } = useRecordingPlayback();
  const { busyId, share: shareTrack, download: downloadTrack } = useRecordingActions();
  const [pickTakeVisible, setPickTakeVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [addTrackVisible, setAddTrackVisible] = useState(false);
  const [deleteProjectVisible, setDeleteProjectVisible] = useState(false);
  const [overdubInstrumentVisible, setOverdubInstrumentVisible] = useState(false);
  const [overdubModeInstrument, setOverdubModeInstrument] = useState<InstrumentId | null>(null);
  const [trackDeleteTarget, setTrackDeleteTarget] = useState<StudioTrack | null>(null);
  const [trackExportTarget, setTrackExportTarget] = useState<{
    track: StudioTrack;
    action: TrackExportAction;
  } | null>(null);
  const modalHandoffTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (modalHandoffTimeoutRef.current) {
        clearTimeout(modalHandoffTimeoutRef.current);
      }
    };
  }, []);

  // Open the next modal after this one has fully closed — opening both
  // native Modals in the same tick can leave the new one's backdrop unable
  // to receive touches on Android until the previous one finishes
  // dismissing.
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

  // Mixed project playback and a single track's preview share the same
  // instrument engines — keep them mutually exclusive.
  const stopAllPlayback = () => {
    if (playingThis) {
      stop();
    }
    stopTrackPlayback();
  };

  const promptOverdubInstrument = () => {
    setOverdubInstrumentVisible(true);
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
        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={styles.title}>
            {project.title}
          </Text>
          <Text style={styles.meta}>
            {t('studio.trackCount', { count: project.tracks.length })} ·{' '}
            {formatDuration(getProjectDurationMs(project))}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={t('studio.rename')}
          hitSlop={8}
          onPress={() => setRenameVisible(true)}
          style={styles.iconBtn}
        >
          <Ionicons color={colors.textSecondary} name="create-outline" size={22} />
        </Pressable>
      </View>

      <View style={styles.transport}>
        <Pressable
          disabled={playLoading || project.tracks.length === 0}
          onPress={() => {
            if (playingThis) {
              stop();
            } else {
              stopTrackPlayback();
              void play(project);
            }
          }}
          style={[
            styles.playBtn,
            playingThis && styles.playBtnActive,
            project.tracks.length === 0 && styles.disabled,
          ]}
        >
          {playLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                color="#FFFFFF"
                name={playingThis ? 'stop' : 'play'}
                size={20}
              />
              <Text style={styles.playBtnText}>
                {playingThis ? t('studio.stop') : t('studio.play')}
              </Text>
            </>
          )}
        </Pressable>
        <Pressable onPress={() => setAddTrackVisible(true)} style={styles.addBtn}>
          <Ionicons color={colors.accent} name="add" size={20} />
          <Text style={styles.addBtnText}>{t('studio.addTrack')}</Text>
        </Pressable>
        <Pressable onPress={() => setDeleteProjectVisible(true)} style={styles.deleteProjectBtn}>
          <Ionicons color={colors.error} name="trash-outline" size={20} />
        </Pressable>
      </View>

      {project.tracks.length >= 5 ? (
        <Text style={styles.hint}>{t('studio.manyTracksHint')}</Text>
      ) : null}

      <ScrollView contentContainerStyle={styles.list}>
        {project.tracks.map((track) => (
          <StudioTrackRow
            key={track.id}
            durationMs={playingTrackId === track.id ? trackDurationMs : undefined}
            isBusy={busyId === track.id}
            isLoading={loadingTrackId === track.id}
            isPlaying={playingTrackId === track.id}
            positionMs={playingTrackId === track.id ? trackPositionMs : 0}
            track={track}
            onDelete={() => setTrackDeleteTarget(track)}
            onDownloadPress={() => setTrackExportTarget({ track, action: 'download' })}
            onPlayPress={() => {
              if (playingThis) {
                stop();
              }
              void playTrack(track);
            }}
            onSeek={seekTrack}
            onSharePress={() => setTrackExportTarget({ track, action: 'share' })}
            onToggleMute={() => {
              stopAllPlayback();
              void patchTrack(track.id, { muted: !track.muted });
            }}
            onToggleSolo={() => {
              stopAllPlayback();
              void patchTrack(track.id, { solo: !track.solo });
            }}
            onVolumeChange={(volume) => {
              stopAllPlayback();
              void patchTrack(track.id, { volume });
            }}
          />
        ))}
      </ScrollView>

      <PickTakeModal
        takes={recordings.filter(
          (take) =>
            (take.mode === 'instrument' && (take.events?.length ?? 0) > 0) ||
            (take.mode === 'microphone' && !!take.audioUri),
        )}
        visible={pickTakeVisible}
        onClose={() => setPickTakeVisible(false)}
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
          scheduleModalHandoff(() => promptOverdubInstrument());
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

      <OptionListModal
        options={[
          {
            key: 'original',
            label: t('recordings.exportFormatOriginal'),
            icon: 'document-outline',
          },
          ...(trackExportTarget && canExportAudioFormat(trackExportTarget.track, 'mp3')
            ? [{ key: 'mp3', label: 'MP3', icon: 'musical-notes-outline' as const }]
            : []),
          ...(trackExportTarget && canExportAudioFormat(trackExportTarget.track, 'mp4')
            ? [{ key: 'mp4', label: 'MP4', icon: 'videocam-outline' as const }]
            : []),
        ]}
        title={t('recordings.exportFormatTitle')}
        visible={trackExportTarget !== null}
        onClose={() => setTrackExportTarget(null)}
        onSelect={(key) => {
          const target = trackExportTarget;
          setTrackExportTarget(null);
          if (!target) {
            return;
          }
          const format = key as ExportFormatChoice;
          if (target.action === 'share') {
            void shareTrack(target.track, format);
          } else {
            void downloadTrack(target.track, format);
          }
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconBtn: {
    padding: 4,
  },
  titleWrap: {
    flex: 1,
    marginHorizontal: 8,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  transport: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  playBtn: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  playBtnActive: {
    backgroundColor: colors.error,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  addBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  addBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteProjectBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  list: {
    paddingBottom: 32,
  },
  disabled: {
    opacity: 0.5,
  },
});
