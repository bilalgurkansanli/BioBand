import {
  BottomTabBar,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

const INSTRUMENT_SCREENS = new Set([
  'Piano',
  'Drums',
  'DrumMachine',
  'Guitar',
  'Violin',
  'Pads',
]);

/**
 * Render nothing on instrument play screens so no tab-bar height is reserved.
 * Style-only hide (display:none) was unreliable with landscape inset changes.
 */
export function RootTabBar(props: BottomTabBarProps) {
  const focusedTab = props.state.routes[props.state.index];
  if (focusedTab?.name === 'Instruments') {
    const nested =
      getFocusedRouteNameFromRoute(focusedTab) ?? 'InstrumentsList';
    if (INSTRUMENT_SCREENS.has(nested)) {
      return null;
    }
  }

  // The Studio timeline is a full-screen landscape editor — hide the tab bar
  // there too, like the instrument play screens.
  if (focusedTab?.name === 'Recordings') {
    const nested = getFocusedRouteNameFromRoute(focusedTab) ?? 'RecordingsList';
    if (nested === 'StudioProject') {
      return null;
    }
  }

  return <BottomTabBar {...props} />;
}
