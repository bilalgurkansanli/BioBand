import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
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

export async function lockLandscapeOrientation(): Promise<void> {
  await ScreenOrientation.lockAsync(LANDSCAPE_LOCK);
}

export async function lockPortraitOrientation(): Promise<void> {
  await ScreenOrientation.lockAsync(PORTRAIT_LOCK);
}

export function usePianoOrientation(
  _navigation: NavigationProp<Record<string, object | undefined>>,
) {
  const { width, height } = useWindowDimensions();
  const [deviceOrientation, setDeviceOrientation] =
    useState<ScreenOrientation.Orientation | null>(null);
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
        setDeviceOrientation(orientation);

        if (isPortraitOrientation(orientation)) {
          await ScreenOrientation.lockAsync(LANDSCAPE_LOCK);
        }
      };

      void enforceLandscape();

      const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
        const orientation = event.orientationInfo.orientation;
        setDeviceOrientation(orientation);

        if (isPortraitOrientation(orientation)) {
          void ScreenOrientation.lockAsync(LANDSCAPE_LOCK);
        }
      });

      return () => {
        isActive = false;
        setIsFocused(false);
        ScreenOrientation.removeOrientationChangeListener(subscription);

        void ScreenOrientation.lockAsync(PORTRAIT_LOCK).then(() => {
          void configureSystemUi();
        });
      };
    }, []),
  );

  const isPortrait =
    isFocused &&
    (width < height ||
      (deviceOrientation !== null && isPortraitOrientation(deviceOrientation)));

  return { isPortrait };
}
