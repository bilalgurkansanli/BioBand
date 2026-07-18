import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { useProfileProgress } from '../hooks/useProfileProgress';
import { loadProfileSettings } from '../storage/profileSettingsStorage';
import { colors } from '../theme/colors';
import type { ProfileChallenge } from '../types/profile';
import type { ProfileStackParamList, RootTabParamList } from '../types/navigation';
import { formatDuration } from '../utils/formatDuration';
import { INSTRUMENT_TITLE_KEYS } from '../utils/recordingLabels';

export function ProfileScreen() {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const {
    loading,
    streakCount,
    todayTotalMs,
    todayByInstrument,
    dailyGoalMs,
    dailyGoalProgress,
    weekDots,
    challenges,
  } = useProfileProgress();
  const [displayName, setDisplayName] = useState('');

  useFocusEffect(
    useCallback(() => {
      void loadProfileSettings().then((settings) => {
        setDisplayName(settings.displayName);
      });
    }, []),
  );

  const goPractice = () => {
    navigation.getParent()?.navigate('Instruments' as keyof RootTabParamList);
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.container}>
        <ScreenHeader title={t('profile.title')} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <ScreenHeader
        title={t('profile.title')}
        right={
          <Pressable
            accessibilityLabel={t('profile.settingsTitle')}
            hitSlop={8}
            onPress={() => navigation.navigate('ProfileSettings')}
            style={styles.settingsBtn}
          >
            <Ionicons color={colors.textSecondary} name="settings-outline" size={24} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {displayName ? (
          <Text style={styles.greeting}>
            {t('profile.greeting', { name: displayName })}
          </Text>
        ) : null}
        <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>

        <View style={styles.card}>
          <View style={styles.streakRow}>
            <View style={styles.streakIcon}>
              <Ionicons color={colors.accent} name="flame" size={28} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.streakValue}>
                {t('profile.streakCount', { count: streakCount })}
              </Text>
              <Text style={styles.muted}>{t('profile.streakHint')}</Text>
            </View>
          </View>
          <View style={styles.dotsRow}>
            {weekDots.map((dot) => (
              <View
                key={dot.dayKey}
                style={[styles.dot, dot.active && styles.dotActive]}
              />
            ))}
          </View>
          <Text style={styles.dotsLabel}>{t('profile.weekDots')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.todayTitle')}</Text>
          <Text style={styles.todayTime}>{formatDuration(todayTotalMs)}</Text>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { width: `${Math.round(dailyGoalProgress * 100)}%` }]}
            />
          </View>
          <Text style={styles.muted}>
            {t('profile.dailyGoal', { goal: formatDuration(dailyGoalMs) })}
          </Text>
          {todayByInstrument.length > 0 ? (
            <View style={styles.breakdown}>
              {todayByInstrument.map((entry) => (
                <Text key={entry.instrument} style={styles.breakdownLine}>
                  {t(INSTRUMENT_TITLE_KEYS[entry.instrument])} ·{' '}
                  {formatDuration(entry.ms)}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>{t('profile.todayEmpty')}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('profile.challengesTitle')}</Text>
        {challenges.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}

        <Pressable
          onPress={goPractice}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Ionicons color="#FFFFFF" name="musical-notes" size={18} />
          <Text style={styles.ctaText}>{t('profile.goPractice')}</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('ProfileSettings')}
          style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}
        >
          <Ionicons color={colors.accent} name="settings-outline" size={18} />
          <Text style={styles.settingsLinkText}>{t('profile.openSettings')}</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function ChallengeCard({ challenge }: { challenge: ProfileChallenge }) {
  const { t } = useTranslation();
  const title = challengeTitle(challenge, t);
  const subtitle = challengeSubtitle(challenge, t);

  return (
    <View style={[styles.card, challenge.completed && styles.cardDone]}>
      <View style={styles.challengeHeader}>
        <View style={styles.flex}>
          <Text style={styles.badge}>
            {challenge.period === 'daily'
              ? t('profile.challengeDaily')
              : t('profile.challengeWeekly')}
          </Text>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
        </View>
        <Ionicons
          color={challenge.completed ? colors.accent : colors.textSecondary}
          name={challenge.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
        />
      </View>
      {challenge.targetMs !== undefined ? (
        <>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.round(Math.min(1, challenge.progress) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.muted}>
            {formatDuration(challenge.currentMs ?? 0)} / {formatDuration(challenge.targetMs)}
          </Text>
        </>
      ) : (
        <Text style={styles.muted}>
          {challenge.completed
            ? t('profile.challengeDone')
            : t('profile.challengePending')}
        </Text>
      )}
    </View>
  );
}

function challengeTitle(
  challenge: ProfileChallenge,
  t: (key: string, opts?: Record<string, string>) => string,
): string {
  const kind = challenge.kind;
  if (kind.type === 'practice-2min') {
    return t('profile.challengePractice2min', {
      instrument: t(INSTRUMENT_TITLE_KEYS[kind.instrument]),
    });
  }
  if (kind.type === 'finish-any-song' || kind.type === 'finish-any-song-week') {
    return t('profile.challengeFinishAnySong');
  }
  if (kind.type === 'song-of-week') {
    return t('profile.challengeSongOfWeek', { title: kind.songTitle });
  }
  return t('profile.challengesTitle');
}

function challengeSubtitle(
  challenge: ProfileChallenge,
  t: (key: string) => string,
): string | null {
  if (challenge.kind.type === 'song-of-week') {
    return t('profile.challengeSongOfWeekHint');
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  settingsBtn: {
    padding: 4,
  },
  scroll: {
    paddingBottom: 32,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  greeting: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  settingsLink: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
  },
  settingsLinkText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  cardDone: {
    borderColor: colors.accent,
  },
  streakRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  streakIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  streakValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  flex: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dot: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    flex: 1,
    height: 10,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotsLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  todayTime: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  barTrack: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    height: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: colors.accent,
    height: '100%',
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  breakdown: {
    marginTop: 10,
    gap: 4,
  },
  breakdownLine: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  challengeHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cta: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 14,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
