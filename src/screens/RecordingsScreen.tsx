import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { RecordingCard } from '../components/recordings/RecordingCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { useRecordingActions } from '../hooks/useRecordingActions';
import { useRecordingPlayback } from '../hooks/useRecordingPlayback';
import { useRecordings } from '../hooks/useRecordings';
import { colors } from '../theme/colors';

export function RecordingsScreen() {
  const { t } = useTranslation();
  const { recordings, loading } = useRecordings();
  const { playingId, loadingId, play } = useRecordingPlayback();
  const { busyId, share, download } = useRecordingActions();

  return (
    <ScreenContainer style={styles.container}>
      <ScreenHeader title={t('recordings.title')} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : recordings.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons color={colors.accent} name="recording" size={28} />
          </View>
          <Text style={styles.emptyTitle}>{t('recordings.emptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('recordings.emptyDescription')}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.subtitle}>{t('recordings.count', { count: recordings.length })}</Text>
          <FlatList
            contentContainerStyle={styles.listContent}
            data={recordings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RecordingCard
                isBusy={busyId === item.id}
                isLoading={loadingId === item.id}
                isPlaying={playingId === item.id}
                onDownloadPress={() => void download(item)}
                onPlayPress={() => void play(item)}
                onSharePress={() => void share(item)}
                recording={item}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
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
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
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
