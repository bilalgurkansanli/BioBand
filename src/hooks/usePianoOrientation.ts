import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useCallback, useState } from 'react';
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
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      setIsFocused(true);

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
        setIsFocused(false);
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
  const isPortrait = isFocused && width < height;

  return { isPortrait };
}
