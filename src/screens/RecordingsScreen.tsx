import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { RecordingCard } from '../components/recordings/RecordingCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { StudioProjectCard } from '../components/studio/StudioProjectCard';
import { StudioSegmentedControl } from '../components/studio/StudioSegmentedControl';
import { TextPromptModal } from '../components/studio/TextPromptModal';
import { useRecordingActions } from '../hooks/useRecordingActions';
import { useRecordingPlayback } from '../hooks/useRecordingPlayback';
import { useRecordings } from '../hooks/useRecordings';
import { useStudioProjects } from '../hooks/useStudioProjects';
import { deleteDrumMachineTake } from '../storage/drumMachinePatternsStorage';
import { deleteRecording } from '../storage/recordingsStorage';
import { colors } from '../theme/colors';
import type { RecordingsStackParamList } from '../types/navigation';
import type { SavedRecording } from '../types/recording';

type Props = NativeStackScreenProps<RecordingsStackParamList, 'RecordingsHome'>;
type Segment = 'takes' | 'studio';

export function RecordingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('takes');
  const [createVisible, setCreateVisible] = useState(false);
  const { recordings, loading: takesLoading, refresh: refreshTakes } = useRecordings();
  const { playingId, loadingId, play } = useRecordingPlayback();
  const { busyId, share, download } = useRecordingActions();
  const { projects, loading: studioLoading, create } = useStudioProjects();

  const removeTake = async (recording: SavedRecording) => {
    if (recording.source === 'drumMachine' || recording.id.startsWith('dm-')) {
      await deleteDrumMachineTake(recording.id);
    } else {
      await deleteRecording(recording.id);
    }
    await refreshTakes();
  };

  const confirmDeleteTake = (recording: SavedRecording) => {
    Alert.alert(t('recordings.deleteConfirmTitle'), t('recordings.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('recordings.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void removeTake(recording);
        },
      },
    ]);
  };

  return (
    <ScreenContainer style={styles.container}>
      <ScreenHeader title={t('recordings.title')} />
      <StudioSegmentedControl
        onChange={(key) => setSegment(key as Segment)}
        segments={[
          { key: 'takes', label: t('recordings.segmentTakes') },
          { key: 'studio', label: t('recordings.segmentStudio') },
        ]}
        value={segment}
      />

      {segment === 'takes' ? (
        takesLoading ? (
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
          <>
            <Text style={styles.subtitle}>
              {t('recordings.count', { count: recordings.length })}
            </Text>
            <FlatList
              contentContainerStyle={styles.listContent}
              data={recordings}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <RecordingCard
                  isBusy={busyId === item.id}
                  isLoading={loadingId === item.id}
                  isPlaying={playingId === item.id}
                  onDeletePress={() => confirmDeleteTake(item)}
                  onDownloadPress={() => void download(item)}
                  onPlayPress={() => void play(item)}
                  onSharePress={() => void share(item)}
                  recording={item}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          </>
        )
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
                  onPress={() =>
                    navigation.navigate('StudioProject', { projectId: item.id })
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
