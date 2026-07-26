import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItemInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import type { InstrumentId, SavedRecording } from '../types/recording';
import type { StudioProject } from '../types/studio';
import { importAudioRecording } from '../utils/recordingImport';
import { INSTRUMENT_TITLE_KEYS } from '../utils/recordingLabels';
import { recordFeatureUse } from '../storage/profileProgressStorage';

type Props = NativeStackScreenProps<RecordingsStackParamList, 'RecordingsHome'>;
type Segment = 'takes' | 'studio';
type InstrumentFilter = InstrumentId | 'all';

/**
 * Below this many takes the list is already scannable, and a search box plus a
 * chip row would be more furniture than help.
 */
const FILTER_UI_THRESHOLD = 5;

export function RecordingsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [segment, setSegment] = useState<Segment>('takes');
  const [search, setSearch] = useState('');
  const [instrumentFilter, setInstrumentFilter] = useState<InstrumentFilter>('all');
  const [createVisible, setCreateVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SavedRecording | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedRecording | null>(null);
  const [importing, setImporting] = useState(false);
  const { recordings, loading: takesLoading, refresh: refreshTakes } = useRecordings();
  const { playingId, loadingId, positionMs, durationMs, rate, cycleRate, loop, toggleLoop, play, seek } =
    useRecordingPlayback();
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

  // One handler per action, shared by every card. Playback repaints this screen
  // ten times a second; a fresh arrow per card would change every card's props
  // on every tick and there would be nothing left for `RecordingCard`'s memo to
  // skip.
  // Which instruments the library actually contains — offering a "Violin" chip
  // to someone who has never recorded one is a dead end.
  const availableInstruments = useMemo(() => {
    const seen: InstrumentId[] = [];
    for (const take of recordings) {
      if (!seen.includes(take.instrument)) {
        seen.push(take.instrument);
      }
    }
    return seen;
  }, [recordings]);

  const visibleRecordings = useMemo(() => {
    // Turkish lowercasing is not the ASCII one: "İ" folds to "i" only with the
    // locale applied, so a search for "keman" must be lowered the same way the
    // titles are.
    const needle = search.trim().toLocaleLowerCase(i18n.language);
    if (!needle && instrumentFilter === 'all') {
      return recordings;
    }
    return recordings.filter((take) => {
      if (instrumentFilter !== 'all' && take.instrument !== instrumentFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      // Untitled takes are listed under their instrument name, so that is what
      // the user sees and what they will type.
      const label = take.title?.trim()
        ? take.title
        : t(INSTRUMENT_TITLE_KEYS[take.instrument]);
      return label.toLocaleLowerCase(i18n.language).includes(needle);
    });
  }, [i18n.language, instrumentFilter, recordings, search, t]);

  const isFiltering = search.trim().length > 0 || instrumentFilter !== 'all';
  const showFilterBar = recordings.length >= FILTER_UI_THRESHOLD;

  const confirmDeleteTake = useCallback((recording: SavedRecording) => {
    setDeleteTarget(recording);
  }, []);
  const handleTitlePress = useCallback((recording: SavedRecording) => {
    setRenameTarget(recording);
  }, []);
  const handlePlayPress = useCallback(
    (recording: SavedRecording) => void play(recording),
    [play],
  );
  const handleSharePress = useCallback(
    (recording: SavedRecording) => void share(recording),
    [share],
  );
  const handleDownloadPress = useCallback(
    (recording: SavedRecording) => void download(recording),
    [download],
  );

  const renderTake = useCallback(
    ({ item }: ListRenderItemInfo<SavedRecording>) => {
      // Only the take being played hears about the position — the rest keep the
      // props they already had, so they never re-render mid-playback.
      const isActive = playingId === item.id;

      return (
        <RecordingCard
          durationMs={isActive ? durationMs : undefined}
          isBusy={busyId === item.id}
          isLoading={loadingId === item.id}
          isPlaying={isActive}
          positionMs={isActive ? positionMs : 0}
          rate={isActive ? rate : 1}
          onCycleRate={isActive ? cycleRate : undefined}
          loop={isActive ? loop : false}
          onToggleLoop={isActive ? toggleLoop : undefined}
          onDeletePress={confirmDeleteTake}
          onDownloadPress={handleDownloadPress}
          onPlayPress={handlePlayPress}
          onSeek={seek}
          onSharePress={handleSharePress}
          onTitlePress={handleTitlePress}
          recording={item}
        />
      );
    },
    [
      busyId,
      confirmDeleteTake,
      cycleRate,
      durationMs,
      handleDownloadPress,
      handlePlayPress,
      handleSharePress,
      handleTitlePress,
      loadingId,
      loop,
      playingId,
      positionMs,
      rate,
      seek,
      toggleLoop,
    ],
  );

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
              {isFiltering
                ? t('recordings.countFiltered', {
                    count: visibleRecordings.length,
                    total: recordings.length,
                  })
                : t('recordings.count', { count: recordings.length })}
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

          {showFilterBar ? (
            <>
              <View style={styles.searchRow}>
                <Ionicons color={colors.textSecondary} name="search" size={16} />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  onChangeText={setSearch}
                  placeholder={t('recordings.searchPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={search}
                />
                {search.length > 0 ? (
                  <Pressable
                    accessibilityLabel={t('common.close')}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setSearch('')}
                  >
                    <Ionicons color={colors.textSecondary} name="close-circle" size={16} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView
                contentContainerStyle={styles.chipRow}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
              >
                <FilterChip
                  active={instrumentFilter === 'all'}
                  label={t('recordings.filterAll')}
                  onPress={() => setInstrumentFilter('all')}
                />
                {availableInstruments.map((instrument) => (
                  <FilterChip
                    active={instrumentFilter === instrument}
                    key={instrument}
                    label={t(INSTRUMENT_TITLE_KEYS[instrument])}
                    onPress={() => setInstrumentFilter(instrument)}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {takesLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : recordings.length === 0 ? (
            <EmptyState
              description={t('recordings.emptyDescription')}
              icon="albums-outline"
              title={t('recordings.emptyTitle')}
            />
          ) : visibleRecordings.length === 0 ? (
            // Distinct from an empty library: nothing is missing, the filter is
            // just too narrow — and the way out has to be offered.
            <EmptyState
              description={t('recordings.noResultsDescription')}
              icon="search"
              title={t('recordings.noResultsTitle')}
            />
          ) : (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={visibleRecordings}
              keyExtractor={(item) => item.id}
              renderItem={renderTake}
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

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
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
  searchRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    // Explicit rather than inherited: on Android the default input height is
    // taller than this row and pushes the list down.
    paddingVertical: 8,
  },
  chipScroll: {
    flexGrow: 0,
    marginTop: 8,
  },
  chipRow: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
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
