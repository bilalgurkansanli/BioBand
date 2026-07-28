import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MODAL_ORIENTATIONS } from '../modalOrientations';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

export type OptionListItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  options: OptionListItem[];
  onSelect: (key: string) => void;
  onClose: () => void;
};

/** Generic themed replacement for a native Alert.alert action sheet. */
export function OptionListModal({ visible, title, message, options, onSelect, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              accessibilityLabel={t('common.close')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Ionicons color="#FFFFFF" name="close" size={18} />
            </Pressable>
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <ScrollView style={styles.list}>
            {options.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => onSelect(option.key)}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <View style={styles.optionIconWrap}>
                  <Ionicons color={colors.accent} name={option.icon} size={20} />
                </View>
                <Text style={styles.optionText}>{option.label}</Text>
                <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
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
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '80%',
    maxWidth: 340,
    padding: 14,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 4,
  },
  title: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 4,
    marginTop: 6,
  },
  list: {
    marginTop: 12,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    padding: 12,
  },
  optionIconWrap: {
    alignItems: 'center',
    backgroundColor: `${colors.accent}22`,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  optionText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    paddingVertical: 12,
  },
  cancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
