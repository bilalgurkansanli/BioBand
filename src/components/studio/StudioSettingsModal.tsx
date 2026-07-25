import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

export type SnapDivision = 4 | 8 | 16;

type Props = {
  visible: boolean;
  metronome: boolean;
  loop: boolean;
  grid: boolean;
  snap: boolean;
  snapDivision: SnapDivision;
  onClose: () => void;
  onToggleMetronome: (value: boolean) => void;
  onToggleLoop: (value: boolean) => void;
  onToggleGrid: (value: boolean) => void;
  onToggleSnap: (value: boolean) => void;
  onChangeSnapDivision: (value: SnapDivision) => void;
  onRename: () => void;
  onDelete: () => void;
};

const SNAP_OPTIONS: { value: SnapDivision; label: string }[] = [
  { value: 4, label: '1/4' },
  { value: 8, label: '1/8' },
  { value: 16, label: '1/16' },
];

export function StudioSettingsModal({
  visible,
  metronome,
  loop,
  grid,
  snap,
  snapDivision,
  onClose,
  onToggleMetronome,
  onToggleLoop,
  onToggleGrid,
  onToggleSnap,
  onChangeSnapDivision,
  onRename,
  onDelete,
}: Props) {
  const { t } = useTranslation();

  const switchColors = { false: colors.surfaceLight, true: colors.accentMuted };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('studio.settingsTitle')}</Text>
            <Pressable
              accessibilityLabel={t('common.close')}
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Ionicons color="#FFFFFF" name="close" size={18} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            style={styles.body}
          >
          <Row icon="musical-note-outline" label={t('studio.metronome')}>
            <Switch
              onValueChange={onToggleMetronome}
              thumbColor={metronome ? colors.accent : '#f4f3f4'}
              trackColor={switchColors}
              value={metronome}
            />
          </Row>

          <Row icon="repeat-outline" label={t('studio.loop')}>
            <Switch
              onValueChange={onToggleLoop}
              thumbColor={loop ? colors.accent : '#f4f3f4'}
              trackColor={switchColors}
              value={loop}
            />
          </Row>

          <Row icon="grid-outline" label={t('studio.grid')}>
            <Switch
              onValueChange={onToggleGrid}
              thumbColor={grid ? colors.accent : '#f4f3f4'}
              trackColor={switchColors}
              value={grid}
            />
          </Row>

          <Row icon="magnet-outline" label={t('studio.snap')}>
            <Switch
              onValueChange={onToggleSnap}
              thumbColor={snap ? colors.accent : '#f4f3f4'}
              trackColor={switchColors}
              value={snap}
            />
          </Row>

          {snap ? (
            <View style={styles.segmentRow}>
              <Text style={styles.segmentLabel}>{t('studio.snapResolution')}</Text>
              <View style={styles.segment}>
                {SNAP_OPTIONS.map((option) => {
                  const active = option.value === snapDivision;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => onChangeSnapDivision(option.value)}
                      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.divider} />

          <Pressable
            onPress={onRename}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.rowIcon}>
              <Ionicons color={colors.accent} name="create-outline" size={18} />
            </View>
            <Text style={styles.rowLabel}>{t('studio.renameTitle')}</Text>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
          </Pressable>

          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={[styles.rowIcon, styles.rowIconDanger]}>
              <Ionicons color={colors.error} name="trash-outline" size={18} />
            </View>
            <Text style={[styles.rowLabel, styles.rowLabelDanger]}>{t('studio.deleteProject')}</Text>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
          </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons color={colors.accent} name={icon} size={18} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
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
    maxHeight: '92%',
    maxWidth: 400,
    padding: 16,
    width: '100%',
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingBottom: 4,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
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
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: `${colors.accent}22`,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rowLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  rowIconDanger: {
    backgroundColor: `${colors.error}22`,
  },
  rowLabelDanger: {
    color: colors.error,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginTop: 14,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingVertical: 8,
  },
  segmentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  segment: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  segmentBtnActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.75,
  },
});
