import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import type { ExportJob } from '../../hooks/useRecordingActions';

type Props = {
  job: ExportJob | null;
  onCancel: () => void;
};

/**
 * Shown while a take is bounced and encoded.
 *
 * Instrument takes are stored as note events, so exporting one means rendering
 * the audio and encoding it in JavaScript — seconds of work for a long take.
 * Without this the app simply looked dead, which is exactly how it was
 * reported.
 */
export function ExportProgressModal({ job, onCancel }: Props) {
  const { t } = useTranslation();
  const percent = Math.round(Math.min(1, Math.max(0, job?.progress ?? 0)) * 100);

  return (
    <Modal animationType="fade" transparent visible={job !== null} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              color="#FFFFFF"
              name={job?.kind === 'share' ? 'share-outline' : 'download-outline'}
              size={24}
            />
          </View>
          <Text style={styles.title}>{t('recordings.exportingTitle')}</Text>
          <Text style={styles.message}>{t('recordings.exportingMessage')}</Text>

          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.percent}>%{percent}</Text>

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
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
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 400,
    padding: 20,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.accent,
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
    marginBottom: 18,
    textAlign: 'center',
  },
  track: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    backgroundColor: colors.accent,
    height: '100%',
  },
  percent: {
    color: colors.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginTop: 10,
  },
  cancelBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 18,
    paddingVertical: 12,
    width: '100%',
  },
  cancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
