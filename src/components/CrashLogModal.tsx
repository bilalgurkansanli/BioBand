import { useCallback, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { MODAL_ORIENTATIONS } from './modalOrientations';
import { useTranslation } from 'react-i18next';

import {
  clearCrashLog,
  formatCrashLog,
  loadCrashLog,
  type CrashRecord,
} from '../diagnostics/crashLog';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCleared: () => void;
};

/**
 * Shows what the app recorded when something went wrong, and lets the user
 * send it on.
 *
 * This is the whole point of keeping a log: turning "uygulama bozuldu" into a
 * stack trace someone can act on.
 */
export function CrashLogModal({ visible, onClose, onCleared }: Props) {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<CrashRecord[]>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let active = true;
    void loadCrashLog().then((loaded) => {
      if (active) {
        setRecords(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, [visible]);

  const share = useCallback(() => {
    void Share.share({ message: formatCrashLog(records) });
  }, [records]);

  const clear = useCallback(() => {
    void clearCrashLog().then(() => {
      setRecords([]);
      onCleared();
      onClose();
    });
  }, [onCleared, onClose]);

  const locale = i18n.language.startsWith('tr')
    ? 'tr-TR'
    : i18n.language.startsWith('de')
      ? 'de-DE'
      : 'en-US';

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('errors.diagnosticsTitle')}</Text>
            <Pressable accessibilityLabel={t('common.close')} hitSlop={8} onPress={onClose}>
              <Ionicons color={colors.textSecondary} name="close" size={22} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{t('errors.diagnosticsSubtitle')}</Text>

          <ScrollView style={styles.list}>
            {records.map((record) => (
              <View key={record.id} style={styles.entry}>
                <Text style={styles.entryTitle}>
                  {record.name}: {record.message}
                </Text>
                <Text style={styles.entryMeta}>
                  {new Date(record.at).toLocaleString(locale, {
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    month: 'short',
                  })}
                  {'  ·  '}
                  {record.source}
                  {'  ·  '}
                  {record.platform}
                </Text>
                {record.stack ? (
                  <Text numberOfLines={4} selectable style={styles.entryStack}>
                    {record.stack}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={clear}
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
            >
              <Text style={styles.btnGhostText}>{t('errors.diagnosticsClear')}</Text>
            </Pressable>
            <Pressable
              onPress={share}
              style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
            >
              <Ionicons color="#FFFFFF" name="share-outline" size={16} />
              <Text style={styles.btnPrimaryText}>{t('errors.diagnosticsShare')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '82%',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    marginTop: 6,
  },
  list: {
    flexGrow: 0,
  },
  entry: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  entryTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  entryMeta: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  entryStack: {
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  btn: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  btnGhost: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
  },
  btnGhostText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
