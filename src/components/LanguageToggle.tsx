import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import i18n, { saveLanguage } from '../i18n';
import { colors } from '../theme/colors';

export function LanguageToggle() {
  const { t } = useTranslation();
  const currentLang = i18n.language === 'tr' ? 'tr' : 'en';
  const nextLang = currentLang === 'tr' ? 'en' : 'tr';
  const label = currentLang === 'tr' ? 'EN' : 'TR';

  const handlePress = async () => {
    await i18n.changeLanguage(nextLang);
    await saveLanguage(nextLang);
  };

  return (
    <Pressable
      accessibilityLabel={t('language.toggle')}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
