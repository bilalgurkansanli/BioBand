import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
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

import { ProfileAvatar } from '../components/ProfileAvatar';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { useProfileProgress } from '../hooks/useProfileProgress';
import { BADGE_META, type Badge } from '../profile/badges';
import {
  DEFAULT_PROFILE_SETTINGS,
  loadProfileSettings,
  type ProfileSettings,
} from '../storage/profileSettingsStorage';
import { colors } from '../theme/colors';
import type { ProfileChallenge } from '../types/profile';
import type { ProfileStackParamList, RootTabParamList } from '../types/navigation';
import { formatDuration, formatPracticeDuration } from '../utils/formatDuration';
import { INSTRUMENT_ICONS, INSTRUMENT_TITLE_KEYS } from '../utils/recordingLabels';

/** 0 (Sun) – 6 (Sat), matching Date.getDay(), from a `YYYY-MM-DD` day key. */
function weekdayIndex(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function ProfileScreen() {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const {
    loading,
    streakCount,
    longestStreak,
    totalPracticeMs,
    thisWeekMs,
    weekTrendRatio,
    todayTotalMs,
    todayByInstrument,
    todayByInstrumentAll,
    dailyGoalMs,
    dailyGoalProgress,
    weekDots,
    challenges,
    badges,
  } = useProfileProgress();
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>(
    DEFAULT_PROFILE_SETTINGS,
  );
  const [showTodayBreakdown, setShowTodayBreakdown] = useState(false);
  const weekdayLabels = t('profile.weekdayShort', { returnObjects: true }) as string[];
  // Busiest instrument first — makes the breakdown read like a mini ranking
  // instead of a fixed, mostly-empty list.
  const todayByInstrumentSorted = [...todayByInstrumentAll].sort((a, b) => b.ms - a.ms);

  useFocusEffect(
    useCallback(() => {
      void loadProfileSettings().then(setProfileSettings);
    }, []),
  );
  const { displayName, avatarColor } = profileSettings;

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
        <View style={styles.identityRow}>
          <ProfileAvatar color={avatarColor} displayName={displayName} size={48} />
          <View style={styles.flex}>
            {displayName ? (
              <Text style={styles.greeting}>
                {t('profile.greeting', { name: displayName })}
              </Text>
            ) : null}
            <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>
          </View>
        </View>

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
              {longestStreak > 0 ? (
                <Text style={styles.bestStreak}>
                  {t('profile.longestStreak', { count: longestStreak })}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.dotsRow}>
            {weekDots.map((dot) => (
              <View key={dot.dayKey} style={styles.dotColumn}>
                <Text style={styles.dotDayLabel}>
                  {weekdayLabels[weekdayIndex(dot.dayKey)]}
                </Text>
                <View
                  style={[
                    styles.dot,
                    dot.active && styles.dotActive,
                    dot.isToday && styles.dotToday,
                  ]}
                >
                  {dot.active ? (
                    <Ionicons color="#FFFFFF" name="checkmark" size={14} />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.dotsLabel}>{t('profile.weekDots')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.statsTitle')}</Text>
          <Text style={styles.todayTime}>{formatPracticeDuration(totalPracticeMs, t)}</Text>
          <Text style={styles.muted}>{t('profile.statsTotalLabel')}</Text>
          <WeekTrend thisWeekMs={thisWeekMs} weekTrendRatio={weekTrendRatio} />
        </View>

        <Pressable
          onPress={() => setShowTodayBreakdown(true)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.todayHeaderRow}>
            <Text style={styles.cardTitle}>{t('profile.todayTitle')}</Text>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
          </View>
          <Text style={styles.todayTime}>{formatPracticeDuration(todayTotalMs, t)}</Text>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { width: `${Math.round(dailyGoalProgress * 100)}%` }]}
            />
          </View>
          <Text style={styles.muted}>
            {t('profile.dailyGoal', { goal: formatPracticeDuration(dailyGoalMs, t) })}
          </Text>
          {todayByInstrument.length > 0 ? (
            <View style={styles.breakdown}>
              {todayByInstrument.map((entry) => (
                <Text key={entry.instrument} style={styles.breakdownLine}>
                  {t(INSTRUMENT_TITLE_KEYS[entry.instrument])} ·{' '}
                  {formatPracticeDuration(entry.ms, t)}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>{t('profile.todayEmpty')}</Text>
          )}
        </Pressable>

        <Text style={styles.sectionTitle}>{t('profile.challengesTitle')}</Text>
        {challenges.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}

        <Text style={styles.sectionTitle}>{t('profile.badgesTitle')}</Text>
        <View style={styles.badgeGrid}>
          {badges.map((badge) => (
            <BadgeCell key={badge.id} badge={badge} />
          ))}
        </View>

        <Pressable
          onPress={goPractice}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Ionicons color="#FFFFFF" name="musical-notes" size={18} />
          <Text style={styles.ctaText}>{t('profile.goPractice')}</Text>
        </Pressable>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowTodayBreakdown(false)}
        transparent
        visible={showTodayBreakdown}
      >
        <Pressable
          onPress={() => setShowTodayBreakdown(false)}
          style={styles.backdrop}
        >
          <Pressable onPress={() => {}} style={styles.sheet}>
            <Pressable
              accessibilityLabel={t('common.close')}
              hitSlop={8}
              onPress={() => setShowTodayBreakdown(false)}
              style={({ pressed }) => [styles.sheetCloseX, pressed && styles.pressed]}
            >
              <Ionicons color="#FFFFFF" name="close" size={18} />
            </Pressable>
            <Text style={styles.sheetTitle}>{t('profile.todayTitle')}</Text>
            <Text style={styles.sheetTotal}>{formatPracticeDuration(todayTotalMs, t)}</Text>
            <Text style={styles.muted}>
              {t('profile.dailyGoal', { goal: formatPracticeDuration(dailyGoalMs, t) })}
            </Text>
            {todayTotalMs === 0 ? (
              <Text style={[styles.muted, styles.sheetEmpty]}>{t('profile.todayEmpty')}</Text>
            ) : (
              <ScrollView style={styles.sheetList}>
                {todayByInstrumentSorted.map((entry) => {
                  const percent =
                    todayTotalMs > 0 ? Math.round((entry.ms / todayTotalMs) * 100) : 0;
                  const practiced = entry.ms > 0;
                  return (
                    <View key={entry.instrument} style={styles.sheetRow}>
                      <View
                        style={[
                          styles.sheetRowIconWrap,
                          practiced && styles.sheetRowIconWrapActive,
                        ]}
                      >
                        <Ionicons
                          color={practiced ? colors.accent : colors.textSecondary}
                          name={INSTRUMENT_ICONS[entry.instrument]}
                          size={16}
                        />
                      </View>
                      <View style={styles.sheetRowText}>
                        <View style={styles.sheetRowTopLine}>
                          <Text
                            style={[
                              styles.sheetRowTitle,
                              !practiced && styles.sheetRowMuted,
                            ]}
                          >
                            {t(INSTRUMENT_TITLE_KEYS[entry.instrument])}
                          </Text>
                          <Text
                            style={[
                              styles.sheetRowValue,
                              !practiced && styles.sheetRowMuted,
                            ]}
                          >
                            {formatPracticeDuration(entry.ms, t)}
                          </Text>
                        </View>
                        {practiced ? (
                          <View style={styles.sheetRowBarTrack}>
                            <View
                              style={[styles.sheetRowBarFill, { width: `${percent}%` }]}
                            />
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

function WeekTrend({
  thisWeekMs,
  weekTrendRatio,
}: {
  thisWeekMs: number;
  weekTrendRatio: number | null;
}) {
  const { t } = useTranslation();

  if (weekTrendRatio === null) {
    if (thisWeekMs <= 0) {
      return null;
    }
    return (
      <View style={styles.trendRow}>
        <Ionicons color={colors.accent} name="sparkles" size={16} />
        <Text style={styles.muted}>{t('profile.weekTrendNew')}</Text>
      </View>
    );
  }

  const percent = Math.round(Math.abs(weekTrendRatio) * 100);
  if (percent === 0) {
    return (
      <View style={styles.trendRow}>
        <Ionicons color={colors.textSecondary} name="remove" size={16} />
        <Text style={styles.muted}>{t('profile.weekTrendFlat')}</Text>
      </View>
    );
  }

  const up = weekTrendRatio > 0;
  return (
    <View style={styles.trendRow}>
      <Ionicons
        color={up ? colors.accent : colors.error}
        name={up ? 'trending-up' : 'trending-down'}
        size={16}
      />
      <Text style={up ? styles.trendTextUp : styles.trendTextDown}>
        {t(up ? 'profile.weekTrendUp' : 'profile.weekTrendDown', { percent })}
      </Text>
    </View>
  );
}

function BadgeCell({ badge }: { badge: Badge }) {
  const { t } = useTranslation();
  const meta = BADGE_META[badge.id];

  return (
    <View style={[styles.badgeCell, badge.earned && styles.badgeCellEarned]}>
      <View style={[styles.badgeIconWrap, badge.earned && styles.badgeIconWrapEarned]}>
        {/* Source art is a square with a bit of flat background around the
            medal, so the image is rendered larger than its circular frame —
            the overflow gets clipped, cropping that background away. */}
        <Image
          resizeMode="cover"
          source={meta.image}
          style={[
            styles.badgeImage,
            meta.imageSize
              ? { height: meta.imageSize, width: meta.imageSize }
              : null,
            !badge.earned && styles.badgeImageLocked,
          ]}
        />
      </View>
      <Text
        numberOfLines={2}
        style={[styles.badgeLabel, badge.earned && styles.badgeLabelEarned]}
      >
        {t(meta.titleKey)}
      </Text>
      {!badge.earned ? (
        <View style={styles.badgeProgressTrack}>
          <View
            style={[
              styles.badgeProgressFill,
              { width: `${Math.round(badge.progress * 100)}%` },
            ]}
          />
        </View>
      ) : null}
    </View>
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
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
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
  bestStreak: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  flex: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dotColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dotDayLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotToday: {
    borderColor: colors.text,
    borderWidth: 2,
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
  todayHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  trendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  trendTextUp: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  trendTextDown: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '700',
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
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  badgeCell: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    width: '31%',
  },
  badgeCellEarned: {
    borderColor: colors.accent,
  },
  badgeIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
    width: 54,
  },
  badgeIconWrapEarned: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  badgeImage: {
    // Rendered bigger than the circular frame on purpose — see comment
    // above the <Image> — so its flat corners get cropped off.
    height: 82,
    width: 82,
  },
  badgeImageLocked: {
    opacity: 0.4,
  },
  badgeLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeLabelEarned: {
    color: colors.text,
  },
  badgeProgressTrack: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    height: 4,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  badgeProgressFill: {
    backgroundColor: colors.accent,
    height: '100%',
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '70%',
    padding: 20,
    paddingTop: 28,
    position: 'relative',
    width: '100%',
    maxWidth: 420,
  },
  sheetCloseX: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
    zIndex: 1,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    paddingRight: 32,
  },
  sheetTotal: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  sheetEmpty: {
    marginTop: 16,
  },
  sheetList: {
    marginBottom: 8,
    marginTop: 16,
  },
  sheetRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    padding: 10,
  },
  sheetRowIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  sheetRowIconWrapActive: {
    backgroundColor: `${colors.accent}22`,
  },
  sheetRowText: {
    flex: 1,
  },
  sheetRowTopLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetRowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  sheetRowValue: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  sheetRowMuted: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sheetRowBarTrack: {
    backgroundColor: colors.background,
    borderRadius: 3,
    height: 5,
    marginTop: 6,
    overflow: 'hidden',
  },
  sheetRowBarFill: {
    backgroundColor: colors.accent,
    height: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
});
