import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ExportProgressModal } from '../components/recordings/ExportProgressModal';
import { RecordingCard } from '../components/recordings/RecordingCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { Toast } from '../components/Toast';
import { StudioProjectCard } from '../components/studio/StudioProjectCard';
import { StudioSegmentedControl } from '../components/studio/StudioSegmentedControl';
import { TextPromptModal } from '../components/studio/TextPromptModal';
import { useRecordingActions } from '../hooks/useRecordingActions';
import { useRecordingPlayback } from '../hooks/useRecordingPlayback';
import { useRecordings } from '../hooks/useRecordings';
import { useStudioProjects } from '../hooks/useStudioProjects';
import {
  deleteDrumMachineTake,
  renameDrumMachineTake,
} from '../storage/drumMachinePatternsStorage';
import { deleteRecording, renameRecording } from '../storage/recordingsStorage';
import { colors } from '../theme/colors';
import type { RecordingsStackParamList } from '../types/navigation';
import type { SavedRecording } from '../types/recording';
import type { StudioProject } from '../types/studio';
import { importAudioRecording } from '../utils/recordingImport';
import { INSTRUMENT_TITLE_KEYS } from '../utils/recordingLabels';
import { recordFeatureUse } from '../storage/profileProgressStorage';

type Props = NativeStackScreenProps<RecordingsStackParamList, 'RecordingsHome'>;
type Segment = 'takes' | 'studio';

export function RecordingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('takes');
  const [createVisible, setCreateVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SavedRecording | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedRecording | null>(null);
  const [importing, setImporting] = useState(false);
  const { recordings, loading: takesLoading, refresh: refreshTakes } = useRecordings();
  const { playingId, loadingId, positionMs, durationMs, play, seek } = useRecordingPlayback();
  const {
    busyId,
    job,
    cancel,
    feedback,
    dismissFeedback,
    share,
    download,
    shareProjectMix,
    downloadProjectMix,
  } = useRecordingActions();
  const { projects, loading: studioLoading, create, remove } = useStudioProjects();
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<StudioProject | null>(null);

  const [importFeedback, setImportFeedback] = useState<{
    variant: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importAudioRecording();
      if (result.ok) {
        await refreshTakes();
        // A restored backup deserves a word — a silently longer list looks
        // like nothing happened.
        if (result.kind === 'backup') {
          setImportFeedback({
            variant: 'success',
            message: t('backup.restoreDone', { count: result.restored }),
          });
        }
        return;
      }
      if (result.code === 'canceled') {
        return;
      }
      setImportFeedback({
        variant: 'error',
        message: t(`recordings.import.errors.${result.code}`),
      });
    } finally {
      setImporting(false);
    }
  };

  const removeTake = async (recording: SavedRecording) => {
    if (recording.source === 'drumMachine' || recording.id.startsWith('dm-')) {
      await deleteDrumMachineTake(recording.id);
    } else {
      await deleteRecording(recording.id);
    }
    await refreshTakes();
  };

  const renameTake = async (recording: SavedRecording, title: string) => {
    if (recording.source === 'drumMachine' || recording.id.startsWith('dm-')) {
      await renameDrumMachineTake(recording.id, title);
    } else {
      await renameRecording(recording.id, title);
    }
    await refreshTakes();
  };

  const confirmDeleteTake = (recording: SavedRecording) => {
    setDeleteTarget(recording);
  };

  return (
    <ScreenContainer style={styles.container}>
      <ScreenHeader title={t('recordings.title')} />
      <StudioSegmentedControl
        onChange={(key) => setSegment(key as Segment)}
        segments={[
          { key: 'takes', label: t('recordings.segmentTakes') },
          { key: 'studio', label: t('recordings.segmentStudio'), badge: t('studio.beta') },
        ]}
        value={segment}
      />

      {segment === 'takes' ? (
        <>
          <View style={styles.studioHeader}>
            <Text style={styles.subtitle}>
              {t('recordings.count', { count: recordings.length })}
            </Text>
            <Pressable
              disabled={importing}
              onPress={() => void handleImport()}
              style={[styles.newButton, importing && styles.disabled]}
            >
              {importing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons color="#FFFFFF" name="folder-open-outline" size={16} />
              )}
              <Text style={styles.newButtonText}>{t('recordings.import.button')}</Text>
            </Pressable>
          </View>
          <Text style={styles.localDataHint}>{t('recordings.localDataHint')}</Text>

          {takesLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : recordings.length === 0 ? (
            <EmptyState
              description={t('recordings.emptyDescription')}
              icon="recording"
              title={t('recordings.emptyTitle')}
            />
          ) : (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={recordings}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <RecordingCard
                  durationMs={playingId === item.id ? durationMs : undefined}
                  isBusy={busyId === item.id}
                  isLoading={loadingId === item.id}
                  isPlaying={playingId === item.id}
                  positionMs={playingId === item.id ? positionMs : 0}
                  onDeletePress={() => confirmDeleteTake(item)}
                  onDownloadPress={() => void download(item)}
                  onPlayPress={() => void play(item)}
                  onSeek={seek}
                  onSharePress={() => void share(item)}
                  onTitlePress={() => setRenameTarget(item)}
                  recording={item}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      ) : studioLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <>
          <View style={styles.studioHeader}>
            <Text style={styles.subtitle}>
              {projects.length} {t('studio.title')}
            </Text>
            <Pressable onPress={() => setCreateVisible(true)} style={styles.newButton}>
              <Ionicons color="#FFFFFF" name="add" size={18} />
              <Text style={styles.newButtonText}>{t('studio.newProject')}</Text>
            </Pressable>
          </View>
          {projects.length === 0 ? (
            <EmptyState
              description={t('studio.emptyDescription')}
              icon="layers"
              title={t('studio.emptyTitle')}
            />
          ) : (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={projects}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <StudioProjectCard
                  isBusy={busyId === item.id}
                  onDeletePress={() => setDeleteProjectTarget(item)}
                  onDownloadPress={() => void downloadProjectMix(item)}
                  onSharePress={() => void shareProjectMix(item)}
                  onPress={() =>
                    {
                      void recordFeatureUse('studioOpened');
                      navigation.navigate('StudioProject', { projectId: item.id });
                    }
                  }
                  project={item}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      <TextPromptModal
        confirmLabel={t('studio.create')}
        initialValue={t('studio.newProjectPlaceholder')}
        placeholder={t('studio.newProjectPlaceholder')}
        title={t('studio.newProjectTitle')}
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        onConfirm={(value) => {
          setCreateVisible(false);
          void create(value || t('studio.defaultTitle')).then((project) => {
            navigation.navigate('StudioProject', { projectId: project.id });
          });
        }}
      />

      <TextPromptModal
        confirmLabel={t('recordings.rename')}
        initialValue={
          renameTarget
            ? renameTarget.title?.trim() || t(INSTRUMENT_TITLE_KEYS[renameTarget.instrument])
            : ''
        }
        placeholder={t('recordings.renamePlaceholder')}
        title={t('recordings.renameTitle')}
        visible={renameTarget !== null}
        onCancel={() => setRenameTarget(null)}
        onConfirm={(value) => {
          if (renameTarget && value) {
            void renameTake(renameTarget, value);
          }
          setRenameTarget(null);
        }}
      />

      <ConfirmDeleteModal
        cancelLabel={t('common.cancel')}
        confirmLabel={t('recordings.deleteConfirm')}
        message={t('recordings.deleteConfirmMessage')}
        title={t('recordings.deleteConfirmTitle')}
        visible={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void removeTake(deleteTarget);
          }
          setDeleteTarget(null);
        }}
      />

      <ConfirmDeleteModal
        cancelLabel={t('common.cancel')}
        confirmLabel={t('recordings.deleteConfirm')}
        message={t('studio.deleteProjectConfirm')}
        title={t('studio.deleteProject')}
        visible={deleteProjectTarget !== null}
        onCancel={() => setDeleteProjectTarget(null)}
        onConfirm={() => {
          if (deleteProjectTarget) {
            void remove(deleteProjectTarget.id);
          }
          setDeleteProjectTarget(null);
        }}
      />

      <ExportProgressModal job={job} onCancel={cancel} />

      <Toast
        message={importFeedback?.message ?? ''}
        onHide={() => setImportFeedback(null)}
        variant={importFeedback?.variant}
        visible={importFeedback !== null}
      />

      <Toast
        detail={feedback?.detail}
        message={feedback?.message ?? ''}
        onHide={dismissFeedback}
        variant={feedback?.variant}
        visible={feedback !== null}
      />
    </ScreenContainer>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Ionicons color={colors.accent} name={icon} size={28} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
    </View>
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
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  localDataHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
    marginTop: -6,
  },
  listContent: {
    paddingBottom: 24,
  },
  studioHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  newButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
