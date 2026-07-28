import type { ModalProps } from 'react-native';

/**
 * Orientations every modal in this app must declare.
 *
 * React Native's `Modal` defaults `supportedOrientations` to `['portrait']` on
 * iOS, and iOS terminates the process — not a JS error, an
 * `UIApplicationInvalidInterfaceOrientation` exception — when a modal that
 * supports no orientation the app is currently in gets presented.
 *
 * Seven screens here lock to landscape (piano, drums, guitar, violin, pads,
 * the drum machine and a Studio project), so every modal opened from their
 * toolbars was a crash on a real device. Android ignores the prop entirely,
 * which is why it never showed up in testing there.
 *
 * Shared rather than written out at each of the ~60 call sites so the list has
 * one owner, and so a new modal has something to copy that is already right.
 */
export const MODAL_ORIENTATIONS: NonNullable<ModalProps['supportedOrientations']> = [
  'portrait',
  'portrait-upside-down',
  'landscape',
  'landscape-left',
  'landscape-right',
];
