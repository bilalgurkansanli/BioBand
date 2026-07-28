import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useCallback } from 'react';
import { AppState, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { configureSystemUi } from '../system/configureSystemUi';

const PORTRAIT_LOCK = ScreenOrientation.OrientationLock.PORTRAIT_UP;
const LANDSCAPE_LOCK = ScreenOrientation.OrientationLock.LANDSCAPE;

const PORTRAIT_ORIENTATIONS = new Set([
  ScreenOrientation.Orientation.PORTRAIT_UP,
  ScreenOrientation.Orientation.PORTRAIT_DOWN,
]);

function isPortraitOrientation(orientation: ScreenOrientation.Orientation): boolean {
  return PORTRAIT_ORIENTATIONS.has(orientation);
}

export async function lockPortraitOrientation(): Promise<void> {
  await ScreenOrientation.lockAsync(PORTRAIT_LOCK);
}

export function usePianoOrientation(
  _navigation: NavigationProp<Record<string, object | undefined>>,
) {
  const { width, height } = useWindowDimensions();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const enforceLandscape = async () => {
        await ScreenOrientation.lockAsync(LANDSCAPE_LOCK);
        if (!isActive) {
          return;
        }

        const orientation = await ScreenOrientation.getOrientationAsync();
        if (isPortraitOrientation(orientation)) {
          await ScreenOrientation.lockAsync(LANDSCAPE_LOCK);
        }
      };

      void enforceLandscape();

      const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
        if (isPortraitOrientation(event.orientationInfo.orientation)) {
          void ScreenOrientation.lockAsync(LANDSCAPE_LOCK);
        }
      });

      // A system screen — the file picker, a share sheet — pauses this activity
      // and can drop the landscape lock on its way out. Nothing physically
      // rotates, so no orientation event arrives to put it right; the lock has
      // to be re-applied when the app comes back.
      const appState = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          void enforceLandscape();
        }
      });

      return () => {
        isActive = false;
        ScreenOrientation.removeOrientationChangeListener(subscription);
        appState.remove();

        void ScreenOrientation.lockAsync(PORTRAIT_LOCK).then(() => {
          void configureSystemUi();
        });
      };
    }, []),
  );

  // The window's own shape decides this, and nothing else. A remembered sensor
  // reading used to be able to override it: a system screen would report
  // portrait, the reading stuck, and returning to a plainly landscape app left
  // the rotate prompt up with no event coming to clear it.
  //
  // Focus is deliberately not part of it. Leaving one of these screens clears
  // focus and re-locks the device to portrait, and the screen keeps rendering
  // through the back transition — so gating on focus switched the guard off at
  // the exact moment the window turned portrait, and a landscape layout was
  // drawn into a portrait window: toolbar crushed into the status bar, timeline
  // gone, tab bar showing through.
  const isPortrait = width < height;

  return { isPortrait };
}
