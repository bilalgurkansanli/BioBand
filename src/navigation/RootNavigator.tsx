import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InstrumentsStack } from './InstrumentsStack';
import { RootTabBar } from './RootTabBar';
import { getTabBarStyle, ROOT_TABS_ID } from './tabBarStyles';
import { HomeScreen } from '../screens/HomeScreen';
import { RecordingsScreen } from '../screens/RecordingsScreen';
import { colors } from '../theme/colors';
import type { RootTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarStyle = getTabBarStyle(insets);

  return (
    <Tab.Navigator
      id={ROOT_TABS_ID}
      tabBar={(props) => <RootTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="home" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Instruments"
        component={InstrumentsStack}
        options={{
          tabBarLabel: t('tabs.instruments'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="musical-notes" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Recordings"
        component={RecordingsScreen}
        options={{
          tabBarLabel: t('tabs.recordings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="recording" size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
