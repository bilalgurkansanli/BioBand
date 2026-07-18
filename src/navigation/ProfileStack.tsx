import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ProfileScreen } from '../screens/ProfileScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { colors } from '../theme/colors';
import type { ProfileStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen component={ProfileScreen} name="ProfileHome" />
      <Stack.Screen component={ProfileSettingsScreen} name="ProfileSettings" />
    </Stack.Navigator>
  );
}
