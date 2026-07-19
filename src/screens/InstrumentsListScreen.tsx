import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { DrumMachineIntroCard } from '../components/instrument/DrumMachineIntroCard';
import { DrumsIntroCard } from '../components/instrument/DrumsIntroCard';
import { GuitarIntroCard } from '../components/instrument/GuitarIntroCard';
import { PadsIntroCard } from '../components/instrument/PadsIntroCard';
import { PianoIntroCard } from '../components/instrument/PianoIntroCard';
import { ViolinIntroCard } from '../components/instrument/ViolinIntroCard';
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

type IntroCardProps = {
  title: string;
  description: string;
  onIntroStart?: () => void;
  onFinished: () => void;
};

const INSTRUMENTS: {
  route: InstrumentRoute;
  titleKey: string;
  descriptionKey: string;
  card: ComponentType<IntroCardProps>;
}[] = [
  {
    route: 'Piano',
    titleKey: 'instruments.piano',
    descriptionKey: 'instruments.pianoDescription',
    card: PianoIntroCard,
  },
  {
    route: 'Drums',
    titleKey: 'instruments.drums',
    descriptionKey: 'instruments.drumsDescription',
    card: DrumsIntroCard,
  },
  {
    route: 'Guitar',
    titleKey: 'instruments.guitar',
    descriptionKey: 'instruments.guitarDescription',
    card: GuitarIntroCard,
  },
  {
    route: 'Pads',
    titleKey: 'instruments.pads',
    descriptionKey: 'instruments.padsDescription',
    card: PadsIntroCard,
  },
  {
    route: 'DrumMachine',
    titleKey: 'instruments.drumMachine',
    descriptionKey: 'instruments.drumMachineDescription',
    card: DrumMachineIntroCard,
  },
  {
    route: 'Violin',
    titleKey: 'instruments.violin',
    descriptionKey: 'instruments.violinDescription',
    card: ViolinIntroCard,
  },
];

export function InstrumentsListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  // While an intro runs, the whole window goes touch-inert so nothing else
  // can be opened mid-animation.
  const [introActive, setIntroActive] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setIntroActive(false);
    }
  }, [isFocused]);

  // Every card runs its own show (art forward + opening motif), then we
  // navigate. Each instrument screen locks landscape on focus — pre-locking
  // here rotates the list mid-transition and warps the UI.
  const handleIntroStart = useCallback(() => {
    setIntroActive(true);
  }, []);

  const handleIntroFinished = useCallback(
    (route: InstrumentRoute) => {
      if (navigation.isFocused()) {
        navigation.navigate(route);
      }
    },
    [navigation],
  );

  return (
    <ScreenContainer style={styles.container}>
      <ScreenHeader title={t('instruments.title')} />
      <Text style={styles.subtitle}>{t('instruments.subtitle')}</Text>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {INSTRUMENTS.map(({ route, titleKey, descriptionKey, card: IntroCard }) => (
          <IntroCard
            description={t(descriptionKey)}
            key={route}
            onFinished={() => handleIntroFinished(route)}
            onIntroStart={handleIntroStart}
            title={t(titleKey)}
          />
        ))}
      </ScrollView>

      {/* Window-level invisible shield: while an intro runs, it swallows
          every touch — other cards, the tab bar, and the Android back
          button — until the instrument screen takes over. */}
      <Modal
        animationType="none"
        onRequestClose={() => {}}
        statusBarTranslucent
        transparent
        visible={introActive}
      >
        <View style={styles.introShield} />
      </Modal>
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
  introShield: {
    flex: 1,
  },
});
