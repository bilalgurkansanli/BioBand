import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { InstrumentsListScreen } from '../screens/InstrumentsListScreen';
import { PianoScreen } from '../screens/PianoScreen';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<InstrumentsStackParamList>();

export function InstrumentsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="InstrumentsList" component={InstrumentsListScreen} />
      <Stack.Screen name="Piano" component={PianoScreen} />
    </Stack.Navigator>
  );
}
