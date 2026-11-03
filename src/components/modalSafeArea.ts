import { useContext, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { type EdgeInsets, SafeAreaInsetsContext } from 'react-native-safe-area-context';

/**
 * Safe-area helpers for full-window modals.
 *
 * React Native 0.86 draws every `Modal` edge to edge on Android, the same as
 * the app itself: the status bar and the three-button navigation bar sit on
 * top of the modal's content, and nothing pads for them. A bottom sheet put
 * its buttons under the navigation bar (and under the iPhone home indicator),
 * and a tall card in landscape slid under the status bar and the notch.
 *
 * The insets are read from the app's own `SafeAreaProvider`. A transparent
 * modal covers the same window the app does, so the app's insets are the
 * modal's insets, and React context reaches into a `Modal`'s subtree. A nested
 * provider inside the modal would measure the same values one frame later.
 */

const NO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * The window's safe-area insets — zero, rather than a throw, outside a
 * provider, since a modal can be rendered from anywhere.
 */
export function useModalInsets(): EdgeInsets {
  return useContext(SafeAreaInsetsContext) ?? NO_INSETS;
}

/**
 * Backdrop padding for a centred card: at least `minimum` on every side (the
 * margin the card already had), and never less than the system bar on that
 * edge. On a device without insets this is exactly the old padding.
 */
export function useCenteredModalPadding(minimum: number): ViewStyle {
  const { top, right, bottom, left } = useModalInsets();
  return useMemo(
    () => ({
      paddingBottom: Math.max(minimum, bottom),
      paddingLeft: Math.max(minimum, left),
      paddingRight: Math.max(minimum, right),
      paddingTop: Math.max(minimum, top),
    }),
    [bottom, left, minimum, right, top],
  );
}
