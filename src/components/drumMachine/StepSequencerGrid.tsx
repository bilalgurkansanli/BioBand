import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type {
  DrumMachineRowDef,
  DrumMachineTheme,
} from '../../instruments/drumMachine/drumMachineBanks';
import { STEP_COUNT, type DrumMachineGrid } from '../../instruments/drumMachine/drumMachineRows';
import { colors } from '../../theme/colors';

type Props = {
  rows: readonly DrumMachineRowDef[];
  theme: DrumMachineTheme;
  grid: DrumMachineGrid;
  currentStep: number;
  onToggleCell: (rowIndex: number, stepIndex: number) => void;
  onPreviewRow: (playKey: string) => void;
};

export function StepSequencerGrid({
  rows,
  theme,
  grid,
  currentStep,
  onToggleCell,
  onPreviewRow,
}: Props) {
  const { t } = useTranslation();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={rows.length > 8}
      style={[styles.root, { backgroundColor: theme.stageBg }]}
    >
      {rows.map((row, rowIndex) => (
        <View key={`${row.playKey}-${rowIndex}`} style={styles.row}>
          <Pressable
            accessibilityLabel={t(row.labelKey)}
            onPress={() => onPreviewRow(row.playKey)}
            style={[styles.iconBtn, { borderColor: theme.accent }]}
          >
            <Ionicons color={theme.accent} name={row.icon} size={18} />
          </Pressable>
          <View style={styles.steps}>
            {Array.from({ length: STEP_COUNT }, (_, stepIndex) => {
              const on = grid[rowIndex]?.[stepIndex] ?? false;
              const beatGroup = Math.floor(stepIndex / 4) % 2 === 0;
              const isPlayhead = currentStep === stepIndex;
              return (
                <Pressable
                  key={stepIndex}
                  onPress={() => onToggleCell(rowIndex, stepIndex)}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: on
                        ? theme.accent
                        : beatGroup
                          ? theme.cellOffA
                          : theme.cellOffB,
                      borderColor: isPlayhead ? '#FFFFFF' : on ? theme.accent : colors.border,
                      borderWidth: isPlayhead ? 2 : 1,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 12,
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    gap: 4,
    padding: 6,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    height: 32,
  },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 36,
  },
  steps: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
    height: '100%',
  },
  cell: {
    borderRadius: 5,
    flex: 1,
    minWidth: 0,
  },
});
