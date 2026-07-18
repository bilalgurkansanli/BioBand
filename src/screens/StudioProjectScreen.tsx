import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '../components/ScreenContainer';
import { PickTakeModal } from '../components/studio/PickTakeModal';
import { nextVolumeStep, StudioTrackRow } from '../components/studio/StudioTrackRow';
import { TextPromptModal } from '../components/studio/TextPromptModal';
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
import { getProjectDurationMs } from '../types/studio';
import { formatDuration } from '../utils/formatDuration';
import { INSTRUMENT_TITLE_KEYS } from '../utils/recordingLabels';

type Props = NativeStackScreenProps<RecordingsStackParamList, 'StudioProject'>;

const INSTRUMENTS: InstrumentId[] = ['piano', 'drums', 'guitar', 'violin', 'pads'];

export function StudioProjectScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const { t } = useTranslation();
  const { project, loading, rename, importTake, patchTrack, deleteTrack, refresh } =
    useStudioProject(projectId);
  const { recordings } = useRecordings();
  const { play, stop, isPlaying, loading: playLoading, playingProjectId } =
    useStudioPlayback();
  const [pickTakeVisible, setPickTakeVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);

  const playingThis = isPlaying && playingProjectId === projectId;

  const openAddMenu = () => {
    Alert.alert(t('studio.addTrack'), undefined, [
      {
        text: t('studio.addFromTake'),
        onPress: () => setPickTakeVisible(true),
      },
      {
        text: t('studio.addOverdub'),
        onPress: () => promptOverdubInstrument(),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const promptOverdubInstrument = () => {
    Alert.alert(
      t('studio.pickInstrumentTitle'),
      undefined,
      [
        ...INSTRUMENTS.map((instrument) => ({
          text: t(INSTRUMENT_TITLE_KEYS[instrument]),
          onPress: () => promptOverdubMode(instrument),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
    );
  };

  const promptOverdubMode = (instrument: InstrumentId) => {
    if (!project) {
      return;
    }
    Alert.alert(t('recording.chooseModeTitle'), t('recording.chooseModeMessage'), [
      {
        text: t('recording.modeInstrument'),
        onPress: () => beginOverdub(instrument, 'instrument'),
      },
      {
        text: t('recording.modeMicrophone'),
        onPress: () => beginOverdub(instrument, 'microphone'),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const beginOverdub = (instrument: InstrumentId, mode: RecordingMode) => {
    if (!project) {
      return;
    }
    stop();
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

  const confirmDeleteProject = () => {
    Alert.alert(t('studio.deleteProject'), t('studio.deleteProjectConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('recordings.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          stop();
          clearStudioOverdubSession();
          void deleteStudioProject(projectId).then(() => navigation.goBack());
        },
      },
    ]);
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
        <Pressable onPress={openAddMenu} style={styles.addBtn}>
          <Ionicons color={colors.accent} name="add" size={20} />
          <Text style={styles.addBtnText}>{t('studio.addTrack')}</Text>
        </Pressable>
        <Pressable onPress={confirmDeleteProject} style={styles.deleteProjectBtn}>
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
            track={track}
            onDelete={() => {
              Alert.alert(t('studio.trackDelete'), t('studio.trackDeleteConfirm'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('recordings.deleteConfirm'),
                  style: 'destructive',
                  onPress: () => {
                    if (playingThis) {
                      stop();
                    }
                    void deleteTrack(track.id);
                  },
                },
              ]);
            }}
            onToggleMute={() => {
              if (playingThis) {
                stop();
              }
              void patchTrack(track.id, { muted: !track.muted });
            }}
            onToggleSolo={() => {
              if (playingThis) {
                stop();
              }
              void patchTrack(track.id, { solo: !track.solo });
            }}
            onVolumeCycle={() => {
              if (playingThis) {
                stop();
              }
              void patchTrack(track.id, { volume: nextVolumeStep(track.volume) });
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
