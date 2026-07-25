import type { ImageSourcePropType } from 'react-native';

import type { ProfileProgress } from '../types/profile';

export type BadgeId =
  | 'streak-3'
  | 'streak-7'
  | 'streak-30'
  | 'practice-1h'
  | 'practice-10h'
  | 'practice-50h'
  | 'first-song';

export type Badge = {
  id: BadgeId;
  earned: boolean;
  /** 0..1, always 1 once earned — drives the locked-badge progress bar. */
  progress: number;
};

const HOUR_MS = 60 * 60 * 1000;

function ratioBadge(id: BadgeId, current: number, target: number): Badge {
  return {
    id,
    earned: current >= target,
    progress: Math.min(1, target > 0 ? current / target : 0),
  };
}

export function buildBadges(progress: ProfileProgress, totalPracticeMs: number): Badge[] {
  return [
    ratioBadge('streak-3', progress.longestStreak, 3),
    ratioBadge('streak-7', progress.longestStreak, 7),
    ratioBadge('streak-30', progress.longestStreak, 30),
    ratioBadge('practice-1h', totalPracticeMs, HOUR_MS),
    ratioBadge('practice-10h', totalPracticeMs, 10 * HOUR_MS),
    ratioBadge('practice-50h', totalPracticeMs, 50 * HOUR_MS),
    ratioBadge('first-song', progress.totalSongCompletions, 1),
  ];
}

export const BADGE_META: Record<
  BadgeId,
  {
    image: ImageSourcePropType;
    titleKey: string;
    /**
     * Some source images have more flat background margin around the medal
     * than others, so the default crop-zoom isn't enough to hide it. Bumps
     * the rendered image size (relative to its circular frame) for those.
     * Omit to use the component's default.
     */
    imageSize?: number;
    /**
     * The medal isn't always centered in its square canvas — some have more
     * margin below than above (or vice versa), so a symmetric center-crop
     * leaves a sliver of flat background on one side. Shifts the rendered
     * image up/down (positive = down) to rebalance the crop. Omit for none.
     */
    imageOffsetY?: number;
  }
> = {
  'streak-3': {
    image: require('../../assets/icons/streak-3.jpeg'),
    titleKey: 'profile.badgeStreak3',
    imageSize: 110,
  },
  'streak-7': {
    image: require('../../assets/icons/streak-7.jpeg'),
    titleKey: 'profile.badgeStreak7',
  },
  'streak-30': {
    image: require('../../assets/icons/streak-30.jpeg'),
    titleKey: 'profile.badgeStreak30',
  },
  'practice-1h': {
    image: require('../../assets/icons/practice-1h.jpeg'),
    titleKey: 'profile.badgePractice1h',
    imageSize: 108,
  },
  'practice-10h': {
    image: require('../../assets/icons/practice-10h.jpeg'),
    titleKey: 'profile.badgePractice10h',
    imageSize: 84,
    imageOffsetY: 3,
  },
  'practice-50h': {
    image: require('../../assets/icons/practice-50h.jpeg'),
    titleKey: 'profile.badgePractice50h',
  },
  'first-song': {
    image: require('../../assets/icons/first-song.jpeg'),
    titleKey: 'profile.badgeFirstSong',
  },
};
