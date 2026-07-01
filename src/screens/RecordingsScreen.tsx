import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors } from '../theme/colors';

export function RecordingsScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer style={styles.container}>
      <ScreenHeader title={t('recordings.title')} />
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>{t('recordings.comingSoon')}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
