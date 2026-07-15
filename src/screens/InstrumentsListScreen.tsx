import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { InstrumentCard } from '../components/InstrumentCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'InstrumentsList'>;

type InstrumentRoute = 'Piano' | 'Drums' | 'Guitar' | 'Violin' | 'Pads';

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

      <InstrumentCard
        actionLabel={t('instruments.open')}
        description={t('instruments.pianoDescription')}
        icon="keypad"
        onPress={() => openInstrument('Piano')}
        title={t('instruments.piano')}
      />

      <InstrumentCard
        actionLabel={t('instruments.open')}
        description={t('instruments.drumsDescription')}
        icon="disc"
        onPress={() => openInstrument('Drums')}
        title={t('instruments.drums')}
      />

      <InstrumentCard
        actionLabel={t('instruments.open')}
        description={t('instruments.guitarDescription')}
        icon="musical-note"
        onPress={() => openInstrument('Guitar')}
        title={t('instruments.guitar')}
      />

      <InstrumentCard
        actionLabel={t('instruments.open')}
        description={t('instruments.violinDescription')}
        icon="musical-notes"
        onPress={() => openInstrument('Violin')}
        title={t('instruments.violin')}
      />

      <InstrumentCard
        actionLabel={t('instruments.open')}
        description={t('instruments.padsDescription')}
        icon="grid"
        onPress={() => openInstrument('Pads')}
        title={t('instruments.pads')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
});
