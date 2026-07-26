import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

type ScreenContainerProps = ViewProps & {
  children: React.ReactNode;
  /**
   * Skip the reading-width cap. For editors that genuinely want every pixel —
   * the Studio timeline shows more of the arrangement the wider it is.
   */
  wide?: boolean;
};

/**
 * Without a cap, a 12.9" iPad stretched every card to the full ~1300pt: title
 * at the far left, its buttons at the far right, nothing in between. The
 * background still fills the screen — only the content column is bounded, the
 * same treatment the piano keyboard and the fretboard already give themselves.
 */
const MAX_CONTENT_WIDTH = 760;

export function ScreenContainer({ children, style, wide = false, ...rest }: ScreenContainerProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container} {...rest}>
      {/* The caller's style lands here rather than on the safe-area view, so a
          screen's own padding applies to the column while the background stays
          edge to edge. */}
      <View style={[styles.content, !wide && styles.capped, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
  },
  capped: {
    alignSelf: 'center',
    maxWidth: MAX_CONTENT_WIDTH,
  },
});
