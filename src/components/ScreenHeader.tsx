import { StyleSheet, Text, View } from 'react-native';

import { LanguageToggle } from './LanguageToggle';
import { colors } from '../theme/colors';

type ScreenHeaderProps = {
  title: string;
};

export function ScreenHeader({ title }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <LanguageToggle />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
  },
});
