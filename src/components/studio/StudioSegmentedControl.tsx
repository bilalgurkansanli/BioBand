import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type Segment = {
  key: string;
  label: string;
  /** Small pill shown next to the label (e.g. "Beta"). */
  badge?: string;
};

type Props = {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
};

export function StudioSegmentedControl({ segments, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            accessibilityRole="button"
            onPress={() => onChange(segment.key)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{segment.label}</Text>
            {segment.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{segment.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: colors.surfaceLight,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.accentMuted,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
