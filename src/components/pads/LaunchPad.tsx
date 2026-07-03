import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../theme/colors';

type LaunchPadProps = {
  label: string;
  color: string;
  size: number;
  onTrigger: () => void;
};

export function LaunchPad({ label, color, size, onTrigger }: LaunchPadProps) {
  const flash = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    onTrigger();
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const backgroundColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, color],
  });

  const borderColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [color, colors.text],
  });

  return (
    <Pressable onPressIn={handlePressIn} style={[styles.pressable, { width: size, height: size }]}>
      <Animated.View style={[styles.pad, { backgroundColor, borderColor }]}>
        <Text numberOfLines={2} style={styles.label}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    padding: 4,
  },
  pad: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    flex: 1,
    justifyContent: 'center',
    padding: 6,
  },
  label: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
