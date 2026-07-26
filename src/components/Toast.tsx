import { useEffect, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export type ToastVariant = 'success' | 'error';

type Props = {
  visible: boolean;
  message: string;
  /** Optional second line — a filename, a reason. Wraps to two lines. */
  detail?: string;
  variant?: ToastVariant;
  onHide: () => void;
};

const VISIBLE_MS = 2000;
/** A filename needs longer on screen than a two-word confirmation. */
const VISIBLE_WITH_DETAIL_MS = 3400;

export function Toast({ visible, message, detail, variant = 'success', onHide }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const isError = variant === 'error';

  // Held in a ref so the dismiss timer does not depend on the callback's
  // identity. Callers pass inline arrows, and a parent that re-renders while
  // the toast is up would otherwise restart the timer every frame — leaving
  // the toast on screen for as long as the screen kept moving.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!visible) {
      return;
    }
    anim.setValue(0);
    Animated.spring(anim, {
      bounciness: 8,
      speed: 14,
      toValue: 1,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(
      () => {
        Animated.timing(anim, {
          duration: 220,
          toValue: 0,
          useNativeDriver: true,
        }).start(() => onHideRef.current());
      },
      detail ? VISIBLE_WITH_DETAIL_MS : VISIBLE_MS,
    );

    return () => clearTimeout(timer);
  }, [anim, detail, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      // Purely informational — taps belong to the list underneath.
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
          ],
        },
      ]}
    >
      <View style={[styles.toast, isError && styles.toastError]}>
        <Ionicons
          color={isError ? colors.error : colors.accent}
          name={isError ? 'alert-circle' : 'checkmark-circle'}
          size={20}
        />
        <View style={styles.content}>
          <Text numberOfLines={2} style={styles.message}>
            {message}
          </Text>
          {detail ? (
            <Text numberOfLines={2} style={styles.detail}>
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    // Below the screen title rather than on top of it. Flush with the top it
    // read as part of the status bar; this sits clear of the header while
    // still being the first thing in view.
    top: 64,
    zIndex: 20,
  },
  toast: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.accent,
    // Squared off rather than a pill: a filename runs to two lines, and a
    // pill's curve eats the corners of the text at that height.
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    maxWidth: 380,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  toastError: {
    borderColor: colors.error,
  },
  content: {
    flexShrink: 1,
  },
  message: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  detail: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});
