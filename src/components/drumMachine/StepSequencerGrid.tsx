import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type {
  DrumMachineRowDef,
  DrumMachineTheme,
} from '../../instruments/drumMachine/drumMachineBanks';
import {
  stepGroupIndex,
  type DrumMachineGrid,
} from '../../instruments/drumMachine/drumMachineRows';
import { colors } from '../../theme/colors';

type Props = {
  rows: readonly DrumMachineRowDef[];
  theme: DrumMachineTheme;
  grid: DrumMachineGrid;
  currentStep: number;
  mutedRows: ReadonlySet<number>;
  onToggleCell: (rowIndex: number, stepIndex: number) => void;
  onPreviewRow: (rowIndex: number) => void;
  onToggleMuteRow: (rowIndex: number) => void;
};

// The playhead advances every 16th note (83ms at 180 BPM), which re-renders
// the whole grid. Memoized cells keep that tick down to the two affected
// playhead columns instead of all rows × steps.
const StepCell = memo(function StepCell({
  rowIndex,
  rowLabel,
  stepIndex,
  level,
  isPlayhead,
  offColor,
  accent,
  onToggleCell,
}: {
  rowIndex: number;
  rowLabel: string;
  stepIndex: number;
  level: number;
  isPlayhead: boolean;
  offColor: string;
  accent: string;
  onToggleCell: (rowIndex: number, stepIndex: number) => void;
}) {
  const on = level > 0;
  const isAccent = level >= 2;
  return (
    <Pressable
      // A bare grid of coloured squares is unreadable without this. Naming the
      // instrument and the step turns it into "Kick, step 3, on".
      accessibilityLabel={`${rowLabel}, ${stepIndex + 1}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={() => onToggleCell(rowIndex, stepIndex)}
      style={[
        styles.cell,
        {
          backgroundColor: on
            ? accent
            : isPlayhead
              ? 'rgba(255,255,255,0.14)'
              : offColor,
          borderColor: isPlayhead ? '#FFFFFF' : on ? accent : colors.border,
          borderWidth: isPlayhead ? 2 : 1,
          opacity: on && !isAccent ? 0.72 : 1,
        },
        isPlayhead && on && styles.cellPlayheadOn,
      ]}
    >
      {isAccent ? <View style={styles.accentDot} /> : null}
    </Pressable>
  );
});

const SequencerRow = memo(function SequencerRow({
  row,
  rowIndex,
  cells,
  currentStep,
  muted,
  theme,
  onToggleCell,
  onPreviewRow,
  onToggleMuteRow,
}: {
  row: DrumMachineRowDef;
  rowIndex: number;
  cells: number[] | undefined;
  currentStep: number;
  muted: boolean;
  theme: DrumMachineTheme;
  onToggleCell: (rowIndex: number, stepIndex: number) => void;
  onPreviewRow: (rowIndex: number) => void;
  onToggleMuteRow: (rowIndex: number) => void;
}) {
  const { t } = useTranslation();
  const stepCount = cells?.length ?? 0;
  const headColor = muted ? colors.textSecondary : theme.accent;

  return (
    <View style={[styles.row, muted && styles.rowMuted]}>
      <Pressable
        accessibilityLabel={t(row.labelKey)}
        accessibilityRole="button"
        accessibilityState={{ selected: !muted }}
        onLongPress={() => onToggleMuteRow(rowIndex)}
        onPress={() => onPreviewRow(rowIndex)}
        style={[styles.iconBtn, { borderColor: headColor }]}
      >
        {muted ? (
          <Ionicons color={headColor} name="volume-mute-outline" size={16} />
        ) : row.shortLabel ? (
          <Text
            maxFontSizeMultiplier={1.3}
            style={[styles.iconLabel, { color: headColor }]}
          >
            {row.shortLabel}
          </Text>
        ) : (
          <Ionicons color={headColor} name={row.icon} size={18} />
        )}
      </Pressable>
      <View style={styles.steps}>
        {Array.from({ length: stepCount }, (_, stepIndex) => {
          const groupParity = stepGroupIndex(stepCount, stepIndex) % 2 === 0;
          return (
            <StepCell
              key={stepIndex}
              accent={theme.accent}
              isPlayhead={currentStep === stepIndex}
              level={cells?.[stepIndex] ?? 0}
              offColor={groupParity ? theme.cellOffA : theme.cellOffB}
              onToggleCell={onToggleCell}
              rowIndex={rowIndex}
              rowLabel={t(row.labelKey)}
              stepIndex={stepIndex}
            />
          );
        })}
      </View>
    </View>
  );
});

export function StepSequencerGrid({
  rows,
  theme,
  grid,
  currentStep,
  mutedRows,
  onToggleCell,
  onPreviewRow,
  onToggleMuteRow,
}: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={rows.length > 8}
      style={[styles.root, { backgroundColor: theme.stageBg }]}
    >
      {rows.map((row, rowIndex) => (
        <SequencerRow
          key={`${row.playKey}-${rowIndex}`}
          cells={grid[rowIndex]}
          currentStep={currentStep}
          muted={mutedRows.has(rowIndex)}
          onPreviewRow={onPreviewRow}
          onToggleCell={onToggleCell}
          onToggleMuteRow={onToggleMuteRow}
          row={row}
          rowIndex={rowIndex}
          theme={theme}
        />
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
  rowMuted: {
    opacity: 0.4,
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
  iconLabel: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  steps: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
    height: '100%',
  },
  cell: {
    alignItems: 'center',
    borderRadius: 5,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  cellPlayheadOn: {
    transform: [{ scale: 1.08 }],
  },
  accentDot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    height: 4,
    width: 4,
  },
});
