import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  displayName: string;
  size?: number;
  photoUrl?: string | null;
};

/** Fixed fallback background (guests / no Google photo yet) — not user-customizable. */
const FALLBACK_COLOR = '#0984E3';

export function ProfileAvatar({ displayName, size = 48, photoUrl }: Props) {
  const initial = displayName.trim().charAt(0).toUpperCase();

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        { backgroundColor: FALLBACK_COLOR, width: size, height: size, borderRadius: size / 2 },
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
