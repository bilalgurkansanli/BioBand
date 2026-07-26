import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InstrumentsStack } from './InstrumentsStack';
import { RecordingsStack } from './RecordingsStack';
import { RootTabBar } from './RootTabBar';
import { getTabBarStyle, ROOT_TABS_ID } from './tabBarStyles';
import { ProfileStack } from './ProfileStack';
import { colors } from '../theme/colors';
import type { RootTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * The bar is a fixed 56pt tall, so an unbounded system text size pushes the
 * label straight out of it. Capping the multiplier lets the label grow with the
 * user's setting up to the point where it still fits, instead of clipping — the
 * navigator's own `tabBarAllowFontScaling` only offers all-or-nothing.
 */
const MAX_TAB_LABEL_SCALE = 1.4;

function TabLabel({ color, label }: { color: string; label: string }) {
  return (
    <Text maxFontSizeMultiplier={MAX_TAB_LABEL_SCALE} numberOfLines={1} style={[styles.tabLabel, { color }]}>
      {label}
    </Text>
  );
}

export function RootNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarStyle = getTabBarStyle(insets);

  return (
    <Tab.Navigator
      id={ROOT_TABS_ID}
      initialRouteName="Instruments"
      tabBar={(props) => <RootTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle,

      }}
    >
      <Tab.Screen
        name="Instruments"
        component={InstrumentsStack}
        options={{
          tabBarLabel: ({ color }: { color: string }) => (
            <TabLabel color={color} label={t('tabs.instruments')} />
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="musical-notes" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Recordings"
        component={RecordingsStack}
        options={{
          tabBarLabel: ({ color }: { color: string }) => (
            <TabLabel color={color} label={t('tabs.recordings')} />
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="albums" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: ({ color }: { color: string }) => (
            <TabLabel color={color} label={t('tabs.profile')} />
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-circle" size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
