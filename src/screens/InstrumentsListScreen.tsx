import { ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { InstrumentCard } from '../components/InstrumentCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'InstrumentsList'>;

type InstrumentRoute =
  | 'Piano'
  | 'Drums'
  | 'Guitar'
  | 'Pads'
  | 'DrumMachine'
  | 'Violin';

const INSTRUMENTS: {
  route: InstrumentRoute;
  icon: 'keypad' | 'disc' | 'musical-note' | 'grid' | 'grid-outline' | 'musical-notes';
  titleKey: string;
  descriptionKey: string;
}[] = [
  {
    route: 'Piano',
    icon: 'keypad',
    titleKey: 'instruments.piano',
    descriptionKey: 'instruments.pianoDescription',
  },
  {
    route: 'Drums',
    icon: 'disc',
    titleKey: 'instruments.drums',
    descriptionKey: 'instruments.drumsDescription',
  },
  {
    route: 'Guitar',
    icon: 'musical-note',
    titleKey: 'instruments.guitar',
    descriptionKey: 'instruments.guitarDescription',
  },
  {
    route: 'Pads',
    icon: 'grid',
    titleKey: 'instruments.pads',
    descriptionKey: 'instruments.padsDescription',
  },
  {
    route: 'DrumMachine',
    icon: 'grid-outline',
    titleKey: 'instruments.drumMachine',
    descriptionKey: 'instruments.drumMachineDescription',
  },
  {
    route: 'Violin',
    icon: 'musical-notes',
    titleKey: 'instruments.violin',
    descriptionKey: 'instruments.violinDescription',
  },
];

export function InstrumentsListScreen({ navigation }: Props) {
  const { t } = useTranslation();

  // Navigate immediately — each instrument screen locks landscape on focus.
  // Pre-locking here rotates the list mid-transition and warps the UI.
  const openInstrument = (route: InstrumentRoute) => {
    navigation.navigate(route);
  };

  return (
    <ScreenContainer style={styles.container}>
      <ScreenHeader title={t('instruments.title')} />
      <Text style={styles.subtitle}>{t('instruments.subtitle')}</Text>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {INSTRUMENTS.map((item) => (
          <InstrumentCard
            key={item.route}
            actionLabel={t('instruments.open')}
            description={t(item.descriptionKey)}
            icon={item.icon}
            onPress={() => openInstrument(item.route)}
            title={t(item.titleKey)}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  list: {
    flexGrow: 1,
    paddingBottom: 8,
  },
});
