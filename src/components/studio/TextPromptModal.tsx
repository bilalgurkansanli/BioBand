import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MODAL_ORIENTATIONS } from '../modalOrientations';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import { useCenteredModalPadding } from '../modalSafeArea';

const BACKDROP_PADDING = 24;

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
  const safeAreaPadding = useCenteredModalPadding(BACKDROP_PADDING);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [visible, initialValue]);

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      {/* The input focuses itself, so the keyboard is up the moment this
          opens — and in landscape on an iPhone it covered the confirm button.
          `padding` on both platforms: iOS never resizes for the keyboard, and
          an edge-to-edge Android dialog no longer does either. Where a window
          does still resize, the view's bottom already sits on the keyboard,
          the overlap it measures is zero, and nothing moves twice. */}
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoider}>
        <Pressable accessible={false} style={[styles.backdrop, safeAreaPadding]} onPress={onCancel}>
          <Pressable accessible={false} style={styles.card} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.title}>{title}</Text>
            <TextInput
              accessibilityLabel={title}
              autoFocus
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={value}
              onChangeText={setValue}
            />
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={onCancel} style={styles.btn}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => onConfirm(value.trim())}
                style={[styles.btn, styles.confirmBtn]}
              >
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // The dim lives here rather than on the backdrop, so the strip the keyboard
  // padding opens up is dimmed along with everything else.
  keyboardAvoider: {
    backgroundColor: colors.backdropSoft,
    flex: 1,
  },
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: BACKDROP_PADDING,
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
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
