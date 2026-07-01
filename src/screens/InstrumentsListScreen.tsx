import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { InstrumentCard } from '../components/InstrumentCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { lockLandscapeOrientation } from '../hooks/usePianoOrientation';
import { useRestoreTabBar } from '../hooks/useRestoreTabBar';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'InstrumentsList'>;

export function InstrumentsListScreen({ navigation }: Props) {
  const { t } = useTranslation();

  useRestoreTabBar(navigation);

  return (
    <ScreenContainer style={styles.container}>
      <ScreenHeader title={t('instruments.title')} />
      <Text style={styles.subtitle}>{t('instruments.subtitle')}</Text>

      <InstrumentCard
        actionLabel={t('instruments.open')}
        description={t('instruments.pianoDescription')}
        icon="keypad"
        onPress={() => {
          void lockLandscapeOrientation().finally(() => {
            navigation.navigate('Piano');
          });
        }}
        title={t('instruments.piano')}
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
