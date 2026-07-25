import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

export function TextPromptModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  confirmLabel,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [visible, initialValue]);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            autoFocus
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={value}
            onChangeText={setValue}
          />
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.btn}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(value.trim())}
              style={[styles.btn, styles.confirmBtn]}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 400,
    padding: 18,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  confirmBtn: {
    backgroundColor: colors.accent,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
