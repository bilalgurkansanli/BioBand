import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
  onPress: () => void;
  disabled?: boolean;
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * "Sign in with Apple", on every platform.
 *
 * iOS gets Apple's own system button, which is what App Store review expects
 * to see. Android has no such component, so it is redrawn here to Apple's
 * branding rules — same white fill, logo, and localized wording — which keeps
 * it consistent with the Google button sitting above it either way.
 */
export function AppleSignInButton({ onPress, disabled = false, cornerRadius = 12, style }: Props) {
  const { t } = useTranslation();

  if (Platform.OS === 'ios') {
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        cornerRadius={cornerRadius}
        // The native button has no disabled state of its own, so the press is
        // gated here and the dimming comes from the style, as on every other
        // button in these screens.
        onPress={() => {
          if (!disabled) {
            onPress();
          }
        }}
        style={[disabled && styles.disabled, style]}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderRadius: cornerRadius },
        style,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons color="#000000" name="logo-apple" size={19} style={styles.icon} />
      <Text maxFontSizeMultiplier={1.3} style={styles.label}>
        {t('auth.signInWithApple')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  icon: {
    // The glyph's own bounding box leaves it sitting a touch low against the
    // cap height of the label next to it.
    marginTop: -2,
  },
  label: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
