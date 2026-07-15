import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type {
  GuitarPlayAlongPhase,
  GuitarPlayAlongProgress,
  SupportLevel,
} from '../../hooks/useGuitarPlayAlong';
import { colors } from '../../theme/colors';

type GuitarPlayAlongHudProps = {
  phase: GuitarPlayAlongPhase;
  countdownValue: number;
  progress: GuitarPlayAlongProgress;
  level: SupportLevel;
  songTitle?: string;
  onStop: () => void;
};

export function GuitarPlayAlongHud({
  phase,
  countdownValue,
  progress,
  level,
  songTitle,
  onStop,
}: GuitarPlayAlongHudProps) {
  const { t } = useTranslation();

  if (phase !== 'countdown' && phase !== 'demo' && phase !== 'playing') {
    return null;
  }

  const isDemo = phase === 'demo';
  const remaining = Math.max(0, progress.total - progress.resolved);

  const progressText =
    progress.total > 0
      ? t(isDemo ? 'guitar.game.hud.progressWatch' : 'guitar.game.hud.progress', {
          done: progress.resolved,
          total: progress.total,
          left: remaining,
          hits: progress.hits,
        })
      : null;

  let status: string | null = null;
  if (phase === 'countdown') {
    status = t('guitar.game.hud.countdown', { count: countdownValue });
  } else if (isDemo) {
    status = t('guitar.game.hud.watching');
  } else if (level === 'medium' && progress.resolved === 0) {
    status = t('guitar.game.hud.tapToStart');
  } else {
    status = t(`guitar.game.levels.${level}`);
  }

  const middleParts: string[] = [];
  if (status) {
    middleParts.push(status);
  }
  if (progressText && phase !== 'countdown') {
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
          <Text style={styles.stopText}>{t('guitar.game.hud.stop')}</Text>
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
    minWidth: 0,
  },
  center: {
    flex: 2,
    minWidth: 0,
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  songName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  middle: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  stopButton: {
    backgroundColor: '#3A3A3C',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stopText: {
    color: '#FFD54F',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
