import { useEffect, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, StyleSheet, Text } from 'react-native';

import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  message: string;
  onHide: () => void;
};

const VISIBLE_MS = 2000;

export function StudioToast({ visible, message, onHide }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }
    anim.setValue(0);
    Animated.spring(anim, {
      bounciness: 8,
      speed: 14,
      toValue: 1,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(anim, {
        duration: 220,
        toValue: 0,
        useNativeDriver: true,
      }).start(() => onHide());
    }, VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [anim, onHide, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
          ],
        },
      ]}
    >
      <Animated.View style={styles.toast}>
        <Ionicons color={colors.accent} name="checkmark-circle" size={20} />
        <Text numberOfLines={1} style={styles.text}>
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 8,
    zIndex: 20,
  },
  toast: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.accent,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    maxWidth: 360,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  text: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
  },
});
