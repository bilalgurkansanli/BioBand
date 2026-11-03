import type { AccessibilityActionEvent } from 'react-native';

/**
 * Takes an element out of the screen reader's world entirely.
 *
 * Both flags are needed — iOS reads `accessibilityElementsHidden`, Android
 * reads `importantForAccessibility` — and the Android value must be
 * `no-hide-descendants` rather than `no`, or children stay focusable.
 *
 * Use for decoration and for redundant affordances: a full-screen dismiss
 * scrim behind a dialog is helpful to a sighted user and pure obstruction to
 * someone swiping through controls, who would land on an enormous unnamed
 * button. Every modal that uses one also has a real close button.
 */
export const SCREEN_READER_HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * The screen reader's double-tap, for elements that have no `onPress`.
 *
 * The instrument surfaces handle raw multi-touch on a parent view, so each
 * key, string or pad is only a drawing — nothing for VoiceOver or TalkBack to
 * press. `onAccessibilityTap` looks like the answer and is iOS-only; the
 * `activate` action reaches both platforms.
 */
export const ACTIVATE_ACTIONS = [{ name: 'activate' }] as const;

/** Swipe up / swipe down on an `adjustable` element. */
export const ADJUSTABLE_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

/** +1 for increment, -1 for decrement, 0 for anything else. */
export function adjustmentDirection(event: AccessibilityActionEvent): -1 | 0 | 1 {
  switch (event.nativeEvent.actionName) {
    case 'increment':
      return 1;
    case 'decrement':
      return -1;
    default:
      return 0;
  }
}

export function isActivateAction(event: AccessibilityActionEvent): boolean {
  return event.nativeEvent.actionName === 'activate';
}
