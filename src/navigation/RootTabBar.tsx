import {
  BottomTabBar,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

const INSTRUMENT_SCREENS = new Set([
  'Piano',
  'Drums',
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

  return <BottomTabBar {...props} />;
}
