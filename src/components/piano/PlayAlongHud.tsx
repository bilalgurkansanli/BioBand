import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type {
  PlayAlongPhase,
  PlayAlongProgress,
  PlayMode,
  SupportLevel,
} from '../../hooks/usePianoPlayAlong';
import { colors } from '../../theme/colors';

type PlayAlongHudProps = {
  phase: PlayAlongPhase;
  countdownValue: number;
  progress: PlayAlongProgress;
  level: SupportLevel;
  playMode?: PlayMode | null;
  isListeningOutro?: boolean;
  songTitle?: string;
  onStop: () => void;
};

export function PlayAlongHud({
  phase,
  countdownValue,
  progress,
  level,
  playMode,
  isListeningOutro = false,
  songTitle,
  onStop,
}: PlayAlongHudProps) {
  const { t } = useTranslation();

  if (phase !== 'countdown' && phase !== 'demo' && phase !== 'playing') {
    return null;
  }

  const isDemo = phase === 'demo';
  const remaining = Math.max(0, progress.total - progress.resolved);

  const progressText =
    progress.total > 0
      ? t(isDemo ? 'piano.game.hud.progressWatch' : 'piano.game.hud.progress', {
          done: progress.resolved,
          total: progress.total,
          left: remaining,
          hits: progress.hits,
        })
      : null;

  let status: string | null = null;
  if (phase === 'countdown') {
    status = t('piano.game.hud.countdown', { count: countdownValue });
  } else if (isDemo) {
    status = t('piano.game.hud.watching');
  } else if (isListeningOutro) {
    status = t('piano.game.hud.listeningOutro');
  } else if (playMode === 'fullBand') {
    status = t('piano.game.hud.bandPerform');
  } else if (level === 'medium' && progress.resolved === 0) {
    status = t('piano.game.hud.tapToStart');
  } else {
    status = t(`piano.game.levels.${level}`);
  }

  const showProgress = Boolean(progressText) && phase !== 'countdown';
  const middleParts: string[] = [];
  if (playMode === 'fullBand' && !isDemo) {
    middleParts.push(t('piano.game.hud.bandLive'));
  }
  if (status) {
    middleParts.push(status);
  }
  if (showProgress && progressText) {
    middleParts.push(progressText);
  }

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        {songTitle ? (
          <Text numberOfLines={1} style={styles.songName}>
            {songTitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.center}>
        {middleParts.length > 0 ? (
          <Text numberOfLines={1} style={styles.middle}>
            {middleParts.join(' · ')}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <Pressable
          onPress={onStop}
          style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}
        >
          <Text style={styles.stopText}>{t('piano.game.hud.stop')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceLight,
    borderColor: '#FFD54F',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  left: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingRight: 6,
  },
  center: {
    alignItems: 'center',
    flex: 1.4,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  right: {
    alignItems: 'flex-end',
    flex: 1,
    justifyContent: 'center',
    minWidth: 64,
  },
  songName: {
    color: '#4DA3FF',
    fontSize: 16,
    fontWeight: '700',
  },
  middle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  stopButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stopText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
