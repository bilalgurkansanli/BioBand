import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MODAL_ORIENTATIONS } from './modalOrientations';
import { useTranslation } from 'react-i18next';

import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  hour: number;
  minute: number;
  onCancel: () => void;
  onConfirm: (hour: number, minute: number) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
/**
 * Five-minute steps rather than all sixty.
 *
 * Nobody needs to be reminded to practise at 19:37, and a 60-row column turns
 * a two-second choice into a scroll hunt.
 */
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const ROW_HEIGHT = 44;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Themed hour/minute picker.
 *
 * Deliberately not the platform time picker: that would add a native module
 * (and a rebuild) to get a dialog in the system's own chrome, which is the
 * exact mismatch that made the old export alerts look out of place here.
 */
export function TimePickerModal({ visible, hour, minute, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();
  const [pickedHour, setPickedHour] = useState(hour);
  const [pickedMinute, setPickedMinute] = useState(minute);
  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    // Re-seed from props on each open, and bring the current value into view —
    // otherwise opening at 22:00 shows a column scrolled to midnight.
    setPickedHour(hour);
    setPickedMinute(minute);
    const nearestMinute = MINUTES.reduce((best, value) =>
      Math.abs(value - minute) < Math.abs(best - minute) ? value : best,
    );
    setPickedMinute(nearestMinute);
    requestAnimationFrame(() => {
      hourRef.current?.scrollTo({ y: Math.max(0, (hour - 1) * ROW_HEIGHT), animated: false });
      minuteRef.current?.scrollTo({
        y: Math.max(0, (MINUTES.indexOf(nearestMinute) - 1) * ROW_HEIGHT),
        animated: false,
      });
    });
  }, [hour, minute, visible]);

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{t('profile.reminderTimeTitle')}</Text>
          <Text style={styles.preview}>
            {pad(pickedHour)}:{pad(pickedMinute)}
          </Text>

          <View style={styles.columns}>
            <Column
              innerRef={hourRef}
              onSelect={setPickedHour}
              selected={pickedHour}
              values={HOURS}
            />
            <Text style={styles.colon}>:</Text>
            <Column
              innerRef={minuteRef}
              onSelect={setPickedMinute}
              selected={pickedMinute}
              values={MINUTES}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.btn, styles.ghost, pressed && styles.pressed]}
            >
              <Text style={styles.ghostText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(pickedHour, pickedMinute)}
              style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>{t('common.save')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Column({
  values,
  selected,
  onSelect,
  innerRef,
}: {
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  innerRef: React.RefObject<ScrollView | null>;
}) {
  return (
    <ScrollView
      ref={innerRef}
      showsVerticalScrollIndicator={false}
      style={styles.column}
    >
      {values.map((value) => {
        const isSelected = value === selected;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={value}
            onPress={() => onSelect(value)}
            style={[styles.row, isSelected && styles.rowSelected]}
          >
            <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
              {pad(value)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 360,
    padding: 20,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  preview: {
    color: colors.accent,
    fontSize: 34,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  columns: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
  },
  column: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: ROW_HEIGHT * 3,
    width: 96,
  },
  colon: {
    color: colors.textSecondary,
    fontSize: 22,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    height: ROW_HEIGHT,
    justifyContent: 'center',
  },
  rowSelected: {
    backgroundColor: colors.surfaceLight,
  },
  rowText: {
    color: colors.textSecondary,
    fontSize: 19,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  rowTextSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  btn: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 12,
  },
  ghost: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
  },
  ghostText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  primary: {
    backgroundColor: colors.accent,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
