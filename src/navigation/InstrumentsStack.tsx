import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DrumMachineScreen } from '../screens/DrumMachineScreen';
import { DrumsScreen } from '../screens/DrumsScreen';
import { GuitarScreen } from '../screens/GuitarScreen';
import { InstrumentsListScreen } from '../screens/InstrumentsListScreen';
import { PadsScreen } from '../screens/PadsScreen';
import { PianoScreen } from '../screens/PianoScreen';
import { ViolinScreen } from '../screens/ViolinScreen';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<InstrumentsStackParamList>();

const instrumentScreenOptions = {
  animation: 'none' as const,
  contentStyle: { backgroundColor: colors.background },
};

export function InstrumentsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="InstrumentsList" component={InstrumentsListScreen} />
      <Stack.Screen
        component={PianoScreen}
        name="Piano"
        options={instrumentScreenOptions}
      />
      <Stack.Screen
        component={DrumsScreen}
        name="Drums"
        options={instrumentScreenOptions}
      />
      <Stack.Screen
        component={DrumMachineScreen}
        name="DrumMachine"
        options={instrumentScreenOptions}
      />
      <Stack.Screen
        component={GuitarScreen}
        name="Guitar"
        options={instrumentScreenOptions}
      />
      <Stack.Screen
        component={ViolinScreen}
        name="Violin"
        options={instrumentScreenOptions}
      />
      <Stack.Screen
        component={PadsScreen}
        name="Pads"
        options={instrumentScreenOptions}
      />
    </Stack.Navigator>
  );
}
