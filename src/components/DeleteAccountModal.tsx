import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  /** A delete is in flight — both buttons lock until the server answers. */
  busy: boolean;
  /** Already-translated reason the last attempt failed, shown in place. */
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

const LOSS_KEYS = [
  'auth.deleteAccountLossAccount',
  'auth.deleteAccountLossCloud',
  'auth.deleteAccountLossDevice',
];

/**
 * Confirmation for the one action in this app that cannot be undone.
 *
 * Unlike ConfirmDeleteModal there is no tappable backdrop, and the confirm
 * button stays disabled until the acknowledgement is ticked: deleting an
 * account has to cost two deliberate taps rather than one stray one.
 */
export function DeleteAccountModal({ visible, busy, errorMessage, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();
  const [acknowledged, setAcknowledged] = useState(false);

  // A reopened sheet has to start unchecked, or a second visit would sit one
  // tap away from deleting the account.
  useEffect(() => {
    if (!visible) {
      setAcknowledged(false);
    }
  }, [visible]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={() => {
        // Android's back gesture is the only exit besides Cancel, and it must
        // not fire while a delete is already on the wire.
        if (!busy) {
          onCancel();
        }
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons color="#FFFFFF" name="trash" size={24} />
          </View>
          <Text style={styles.title}>{t('auth.deleteAccountConfirmTitle')}</Text>
          <Text style={styles.message}>{t('auth.deleteAccountConfirmMessage')}</Text>

          <View style={styles.lossList}>
            {LOSS_KEYS.map((key) => (
              <View key={key} style={styles.lossRow}>
                <Ionicons color={colors.error} name="close-circle" size={15} />
                <Text style={styles.lossText}>{t(key)}</Text>
              </View>
            ))}
          </View>

          <Pressable
            accessibilityLabel={t('auth.deleteAccountAcknowledgeA11y')}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged, disabled: busy }}
            disabled={busy}
            hitSlop={6}
            onPress={() => setAcknowledged((prev) => !prev)}
            style={styles.acknowledgeRow}
          >
            <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
              {acknowledged ? <Ionicons color="#FFFFFF" name="checkmark" size={13} /> : null}
            </View>
            <Text style={styles.acknowledgeText}>{t('auth.deleteAccountAcknowledge')}</Text>
          </Pressable>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              disabled={busy}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                styles.cancelBtn,
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={!acknowledged || busy}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                styles.confirmBtn,
                pressed && styles.pressed,
                (!acknowledged || busy) && styles.disabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmText}>{t('auth.deleteAccountConfirm')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 400,
    padding: 20,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginBottom: 14,
    width: 52,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    textAlign: 'center',
  },
  lossList: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    padding: 12,
    width: '100%',
  },
  lossRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  lossText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  acknowledgeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    width: '100%',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 5,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    marginTop: 1,
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  acknowledgeText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 12,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
  },
  confirmBtn: {
    backgroundColor: colors.error,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  cancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
