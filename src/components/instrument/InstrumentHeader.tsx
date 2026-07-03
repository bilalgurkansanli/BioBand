import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

type InstrumentHeaderProps = {
  title: string;
  isRecording: boolean;
  onBack: () => void;
  onRecordPress: () => void;
  onTutorialPress?: () => void;
};

export function InstrumentHeader({
  title,
  isRecording,
  onBack,
  onRecordPress,
  onTutorialPress,
}: InstrumentHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <Pressable
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [styles.backWrap, pressed && styles.pressed]}
      >
        <Text style={styles.backButton}>← {t('common.back')}</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.headerActions}>
        <Pressable
          hitSlop={8}
          onPress={onRecordPress}
          style={({ pressed }) => [
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.recordButtonText, isRecording && styles.recordButtonTextActive]}>
            {isRecording ? t('recording.stop') : t('recording.button')}
          </Text>
        </Pressable>
        {onTutorialPress ? (
          <Pressable
            hitSlop={8}
            onPress={onTutorialPress}
            style={({ pressed }) => [styles.tutorialButton, pressed && styles.pressed]}
          >
            <Text style={styles.tutorialButtonText}>{t('tutorial.start')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backWrap: {
    minWidth: 72,
  },
  backButton: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 72,
  },
  recordButton: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.error,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recordButtonActive: {
    backgroundColor: colors.error,
  },
  recordButtonText: {
    color: colors.error,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  recordButtonTextActive: {
    color: colors.text,
  },
  tutorialButton: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tutorialButtonText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
