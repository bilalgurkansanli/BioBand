import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

type ScreenContainerProps = ViewProps & {
  children: React.ReactNode;
};

export function ScreenContainer({ children, style, ...rest }: ScreenContainerProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, style]} {...rest}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
