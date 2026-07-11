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
  songTitle?: string;
  onStop: () => void;
};

export function PlayAlongHud({
  phase,
  countdownValue,
  progress,
  level,
  playMode,
  songTitle,
  onStop,
}: PlayAlongHudProps) {
  const { t } = useTranslation();

  if (phase !== 'countdown' && phase !== 'demo' && phase !== 'playing') {
    return null;
  }

  const watchingLabel =
    playMode === 'fullBand'
      ? t('piano.game.hud.watchingBand')
      : t('piano.game.hud.watching');

  return (
    <View style={styles.banner}>
      <View style={styles.info}>
        {songTitle ? <Text style={styles.songName}>{songTitle}</Text> : null}
        {playMode === 'fullBand' ? (
          <Text style={styles.bandBadge}>{t('piano.game.hud.bandLive')}</Text>
        ) : null}
        {phase === 'countdown' ? (
          <Text style={styles.countdown}>
            {t('piano.game.hud.countdown', { count: countdownValue })}
          </Text>
        ) : phase === 'demo' ? (
          <Text style={styles.countdown}>{watchingLabel}</Text>
        ) : level === 'medium' && progress.resolved === 0 ? (
          <Text style={styles.countdown}>{t('piano.game.hud.tapToStart')}</Text>
        ) : (
          <Text style={styles.message}>
            {t('piano.game.hud.progress', {
              done: progress.resolved,
              total: progress.total,
              hits: progress.hits,
            })}
            {'  ·  '}
            {t(`piano.game.levels.${level}`)}
          </Text>
        )}
      </View>

      <Pressable
        onPress={onStop}
        style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}
      >
        <Text style={styles.stopText}>{t('piano.game.hud.stop')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: '#FFD54F',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  info: {
    flex: 1,
  },
  songName: {
    color: '#FFD54F',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  bandBadge: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  countdown: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  message: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  stopButton: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stopText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
