import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RecordingsScreen } from '../screens/RecordingsScreen';
import { StudioProjectScreen } from '../screens/StudioProjectScreen';
import { colors } from '../theme/colors';
import type { RecordingsStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RecordingsStackParamList>();

export function RecordingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen component={RecordingsScreen} name="RecordingsHome" />
      <Stack.Screen component={StudioProjectScreen} name="StudioProject" />
    </Stack.Navigator>
  );
}
