import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DrumsScreen } from '../screens/DrumsScreen';
import { GuitarScreen } from '../screens/GuitarScreen';
import { InstrumentsListScreen } from '../screens/InstrumentsListScreen';
import { PadsScreen } from '../screens/PadsScreen';
import { PianoScreen } from '../screens/PianoScreen';
import { ViolinScreen } from '../screens/ViolinScreen';
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
      <Stack.Screen name="Drums" component={DrumsScreen} />
      <Stack.Screen name="Guitar" component={GuitarScreen} />
      <Stack.Screen name="Violin" component={ViolinScreen} />
      <Stack.Screen name="Pads" component={PadsScreen} />
    </Stack.Navigator>
  );
}
