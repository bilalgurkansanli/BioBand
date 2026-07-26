import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  BAR_PADDING_TOP,
  EXTRA_BOTTOM_SPACING,
  TAB_BAR_CONTENT_HEIGHT,
  getTabBarHeight,
} from '../navigation/tabBarStyles';
import { colors } from '../theme/colors';

type Props = {
  onDone: () => void;
};

/** Tab index each step points at; the last step points at nothing. */
const STEPS = [
  { key: 'instruments', tabIndex: 0, icon: 'musical-notes' },
  { key: 'recordings', tabIndex: 1, icon: 'albums' },
  { key: 'profile', tabIndex: 2, icon: 'person-circle' },
  { key: 'welcome', tabIndex: null, icon: null },
] as const;

const TAB_COUNT = 3;
const RING_SIZE = 88;

/**
 * A guided tour drawn *over* the running app rather than instead of it.
 *
 * The previous version was three standalone cards, which meant the user read
 * about a tab bar they could not see and then had to map the description onto
 * the real thing afterwards. Pointing at the actual tabs removes that step:
 * the highlight is on the button they will press.
 *
 * Tab positions are computed rather than measured. The bar is three equal
 * columns whose height comes from `tabBarStyles`, so arithmetic gives the same
 * answer a layout pass would — without threading refs out of the navigator.
 */
export function CoachTour({ onDone }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  // Everything is measured UP FROM THE BOTTOM of the screen, never down from
  // its height. On Android the window height reported here does not reliably
  // include the system navigation bar, so anything derived from it landed the
  // ring above the tab it was pointing at and left an undimmed strip below the
  // scrim. `insets.bottom` and the bar's own constants are exact.
  const barHeight = getTabBarHeight(insets);
  const barPaddingBottom = insets.bottom + EXTRA_BOTTOM_SPACING;
  /** Height of the icon + label block inside the bar. */
  const contentHeight = TAB_BAR_CONTENT_HEIGHT - BAR_PADDING_TOP;
  /** Distance from the screen bottom to the middle of a tab's icon/label. */
  const targetFromBottom = barPaddingBottom + contentHeight / 2;
  const targetX =
    step.tabIndex === null ? width / 2 : (width * (step.tabIndex + 0.5)) / TAB_COUNT;

  const advance = () => {
    if (isLast) {
      onDone();
      return;
    }
    setIndex(index + 1);
  };

  // Clear of the ring rather than resting on it — the pointer needs somewhere
  // to sit, and an overlap made the highlight look like part of the bubble.
  const bubbleBottom = targetFromBottom + RING_SIZE / 2 + 18;

  return (
    <View style={styles.root}>
      {/* Stops at the top of the tab bar. Dimming the bar too would hide the
          very thing each step points at — the highlighted tab has to stay as
          bright as it will be a moment later. */}
      <Pressable style={[styles.scrim, { bottom: barHeight }]} onPress={advance} />

      {/* Invisible, but still catches taps: the bar underneath is untouched,
          and without this a tap there would navigate away mid-tour. */}
      <Pressable
        style={[styles.barBlocker, { height: barHeight }]}
        onPress={advance}
      />

      {step.tabIndex !== null ? (
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              bottom: targetFromBottom - RING_SIZE / 2,
              left: targetX - RING_SIZE / 2,
            },
          ]}
        />
      ) : null}

      <View
        pointerEvents="box-none"
        style={[
          styles.bubbleWrap,
          step.tabIndex === null
            ? { justifyContent: 'center', top: 0, bottom: 0 }
            : { bottom: bubbleBottom },
        ]}
      >
        <View style={styles.bubble}>
          {isLast ? (
            <>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.welcomeTitle}>{t('onboarding.welcome.title')}</Text>
              <Text style={styles.welcomeBody}>{t('onboarding.welcome.body')}</Text>
            </>
          ) : (
            <>
              <View style={styles.headerRow}>
                {step.icon ? (
                  <Ionicons color={colors.accent} name={step.icon} size={20} />
                ) : null}
                <Text style={styles.title}>{t(`tabs.${step.key}`)}</Text>
              </View>
              <Text style={styles.body}>{t(`onboarding.${step.key}.body`)}</Text>
            </>
          )}

          <View style={styles.footer}>
            <View style={styles.dots}>
              {STEPS.map((entry, dotIndex) => (
                <View
                  key={entry.key}
                  style={[styles.dot, dotIndex === index && styles.dotActive]}
                />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={advance}
              style={({ pressed }) => [styles.next, pressed && styles.pressed]}
            >
              <Text style={styles.nextText}>
                {isLast ? t('onboarding.start') : t('onboarding.next')}
              </Text>
              <Ionicons
                color="#FFFFFF"
                name={isLast ? 'checkmark' : 'arrow-forward'}
                size={16}
              />
            </Pressable>
          </View>
        </View>

        {/* Points down at the highlighted tab. */}
        {step.tabIndex !== null ? (
          <View
            pointerEvents="none"
            style={[styles.pointer, { left: targetX - 9 }]}
          />
        ) : null}
      </View>

      {!isLast ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={onDone}
          style={({ pressed }) => [
            styles.skip,
            { top: insets.top + 10 },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.82)',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  barBlocker: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  ring: {
    borderColor: colors.accent,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    height: RING_SIZE,
    position: 'absolute',
    width: RING_SIZE,
  },
  bubbleWrap: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  bubble: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    maxWidth: 380,
    padding: 18,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },
  logo: {
    alignSelf: 'center',
    borderRadius: 22,
    height: 110,
    marginBottom: 12,
    width: 110,
  },
  welcomeTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  pointer: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 9,
    borderRightColor: 'transparent',
    borderRightWidth: 9,
    borderTopColor: colors.surface,
    borderTopWidth: 10,
    height: 0,
    position: 'absolute',
    // Sits just under the bubble, overlapping its border by a hair.
    top: '100%',
    width: 0,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    backgroundColor: colors.border,
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 18,
  },
  next: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  skip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 9,
    position: 'absolute',
    right: 14,
  },
  skipText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
