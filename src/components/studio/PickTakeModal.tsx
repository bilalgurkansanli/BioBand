import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import type { SavedRecording } from '../../types/recording';
import { formatDuration } from '../../utils/formatDuration';
import { INSTRUMENT_TITLE_KEYS } from '../../utils/recordingLabels';

type Props = {
  visible: boolean;
  takes: SavedRecording[];
  onClose: () => void;
  onSelect: (take: SavedRecording) => void;
};

export function PickTakeModal({ visible, takes, onClose, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('studio.pickTakeTitle')}</Text>
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
                  <Text style={styles.rowTitle}>
                    {t(INSTRUMENT_TITLE_KEYS[take.instrument])}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {take.mode === 'microphone'
                      ? t('recordings.modeMicrophone')
                      : t('recordings.modeInstrument')}{' '}
                    · {formatDuration(take.durationMs)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    padding: 20,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
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
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.75,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
