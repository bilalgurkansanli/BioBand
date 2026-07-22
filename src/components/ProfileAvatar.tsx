import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';

type Props = {
  displayName: string;
  color: string | null;
  size?: number;
};

export function ProfileAvatar({ displayName, color, size = 48 }: Props) {
  const initial = displayName.trim().charAt(0).toUpperCase();
  const backgroundColor = color ?? colors.accent;

  return (
    <View
      style={[
        styles.circle,
        { backgroundColor, width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {initial ? (
        <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{initial}</Text>
      ) : (
        <Ionicons color="#FFFFFF" name="person" size={size * 0.5} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
