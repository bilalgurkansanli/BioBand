import { KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

/**
 * The drum machine's "name this pattern" overlay (split out of DrumMachineScreen).
 *
 * The name field focuses itself, and in landscape a phone keyboard is taller
 * than the space under a centred card — so the overlay lifts above it rather
 * than hiding the Save button.
 */
export function SavePatternDialog({
  accent,
  name,
  onChangeName,
  onCancel,
  onConfirm,
}: {
  accent: string;
  name: string;
  onChangeName: (name: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const canSave = name.trim().length > 0;

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoider}>
      <Pressable accessible={false} onPress={onCancel} style={styles.nameOverlay}>
        <Pressable accessible={false} onPress={() => {}} style={[styles.nameCard, { borderColor: accent }]}>
          <Text style={styles.nameTitle}>{t('drumMachine.saveTitle')}</Text>
          <TextInput
            accessibilityLabel={t('drumMachine.saveTitle')}
            autoFocus
            placeholder={t('drumMachine.namePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.nameInput, { borderColor: accent }]}
            value={name}
            onChangeText={onChangeName}
            maxLength={40}
          />
          <View style={styles.nameActions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.nameBtn}>
              <Text style={styles.nameBtnText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              disabled={!canSave}
              onPress={onConfirm}
              style={[
                styles.nameBtn,
                styles.nameBtnPrimary,
                { backgroundColor: accent },
                !canSave && styles.nameBtnDisabled,
              ]}
            >
              <Text style={[styles.nameBtnText, styles.nameBtnPrimaryText]}>
                {t('common.save')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  nameOverlay: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  nameCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    width: '100%',
  },
  nameTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  nameInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1.5,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nameActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  nameBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nameBtnPrimary: {
    borderRadius: 8,
  },
  nameBtnDisabled: {
    opacity: 0.45,
  },
  nameBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  nameBtnPrimaryText: {
    color: '#FFFFFF',
  },
});
