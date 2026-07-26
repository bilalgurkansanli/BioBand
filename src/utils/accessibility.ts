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
