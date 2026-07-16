import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import { openStoreReview } from '../../utils/openStoreReview';

type RequestSongPromptProps = {
  /** i18n key for the body text, e.g. `piano.game.requestSong`. */
  messageKey: string;
  /** i18n key when the store page fails to open. */
  openFailedKey: string;
};

export function RequestSongPrompt({
  messageKey,
  openFailedKey,
}: RequestSongPromptProps) {
  const { t } = useTranslation();

  const handleOpenStore = () => {
    void openStoreReview().catch(() => {
      Alert.alert(t(openFailedKey));
    });
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="link"
        onPress={handleOpenStore}
        style={({ pressed }) => [styles.messageRow, pressed && styles.pressed]}
      >
        <Ionicons
          color={colors.accent}
          name="chatbubble-ellipses-outline"
          size={16}
        />
        <Text style={styles.messageText}>{t(messageKey)}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={handleOpenStore}
        style={({ pressed }) => [styles.ctaButton, pressed && styles.pressed]}
      >
        <Text style={styles.ctaText}>{t('common.writeReview')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    marginTop: 4,
  },
  messageRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  ctaButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
  },
  ctaText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
