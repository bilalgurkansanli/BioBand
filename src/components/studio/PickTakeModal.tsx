import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import type { SavedRecording } from '../../types/recording';
import { formatDuration } from '../../utils/formatDuration';
import { INSTRUMENT_ICONS, INSTRUMENT_TITLE_KEYS } from '../../utils/recordingLabels';

type Props = {
  visible: boolean;
  takes: SavedRecording[];
  onClose: () => void;
  onSelect: (take: SavedRecording) => void;
};

export function PickTakeModal({ visible, takes, onClose, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* A plain View claims the touch responder for anything starting
            inside the card, so taps here never reach the backdrop below —
            more reliable than relying on event.stopPropagation() alone. */}
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('studio.pickTakeTitle')}</Text>
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
          {takes.length === 0 ? (
            <Text style={styles.empty}>{t('studio.pickTakeEmpty')}</Text>
          ) : (
            <ScrollView style={styles.list}>
              {takes.map((take) => (
                <Pressable
                  key={take.id}
                  onPress={() => onSelect(take)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.rowIconWrap}>
                    <Ionicons
                      color={colors.accent}
                      name={INSTRUMENT_ICONS[take.instrument]}
                      size={18}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>
                      {t(INSTRUMENT_TITLE_KEYS[take.instrument])}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {take.mode === 'microphone'
                        ? t('recordings.modeMicrophone')
                        : t('recordings.modeInstrument')}{' '}
                      · {formatDuration(take.durationMs)}
                    </Text>
                  </View>
                  <Ionicons color={colors.textSecondary} name="chevron-forward" size={16} />
                </Pressable>
              ))}
            </ScrollView>
          )}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
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
    padding: 20,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
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
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
  },
  list: {
    marginBottom: 8,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    padding: 10,
  },
  rowIconWrap: {
    alignItems: 'center',
    backgroundColor: `${colors.accent}22`,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressed: {
    opacity: 0.75,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  cancel: {
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
});
