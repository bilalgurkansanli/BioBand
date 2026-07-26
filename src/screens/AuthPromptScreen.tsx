import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { syncAfterSignIn } from '../auth/useAuthSession';
import { signInWithApple } from '../auth/appleAuth';
import { signInWithGoogle } from '../auth/googleAuth';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { LaunchScreen } from '../components/LaunchScreen';
import { ScreenContainer } from '../components/ScreenContainer';
import i18n, { saveLanguage, type AppLanguage } from '../i18n';
import { markOnboardingPromptSeen } from '../storage/appDataKeys';
import { isSupabaseConfigured } from '../supabase/client';
import { colors } from '../theme/colors';

type Props = {
  onDone: () => void;
  skipLanguageStep?: boolean;
};

type Step = 'language' | 'auth';

const LANGUAGES: { code: AppLanguage; label: string; flag: string }[] = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export function AuthPromptScreen({ onDone, skipLanguageStep = false }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(skipLanguageStep ? 'auth' : 'language');
  const [signingIn, setSigningIn] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const selectLanguage = async (language: AppLanguage) => {
    await i18n.changeLanguage(language);
    await saveLanguage(language);
    setStep('auth');
  };

  const finish = async () => {
    await markOnboardingPromptSeen();
    onDone();
  };

  const handleGoogleSignIn = async () => {
    setErrorKey(null);
    setSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (result.ok) {
        await syncAfterSignIn(result.session.user.id, result.googleProfile);
        await finish();
        return;
      }
      if (result.code === 'canceled') {
        return;
      }
      setErrorKey(`auth.errors.${result.code}`);
    } finally {
      setSigningIn(false);
    }
  };

  const handleAppleSignIn = async () => {
    setErrorKey(null);
    setSigningIn(true);
    try {
      const result = await signInWithApple();
      if (result.ok) {
        await syncAfterSignIn(result.session.user.id, result.appleProfile);
        await finish();
        return;
      }
      if (result.code === 'canceled') {
        return;
      }
      setErrorKey(`auth.errors.${result.code}`);
    } finally {
      setSigningIn(false);
    }
  };

  const handleContinueAsGuest = () => {
    void finish();
  };

  if (step === 'language') {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.body}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome to BioBand</Text>
          <Text style={styles.subtitle}>Choose your language · Dilini seç · Wähle deine Sprache</Text>

          <View style={styles.languageList}>
            {LANGUAGES.map((language) => (
              <Pressable
                key={language.code}
                onPress={() => void selectLanguage(language.code)}
                style={({ pressed }) => [styles.languageCard, pressed && styles.pressed]}
              >
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text style={styles.languageLabel}>{language.label}</Text>
                <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // Signing in means a round trip to Google or Apple and then a Supabase sync,
  // which on a slow connection is several seconds of nothing happening. The
  // launch screen covers it with the app's own face instead of leaving the
  // user staring at a spinner inside a button.
  if (signingIn) {
    return <LaunchScreen label={t('auth.signingIn')} />;
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.body}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.welcome}>{t('launch.welcome')}</Text>
        <Text style={styles.title}>{t('auth.promptTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.promptSubtitle')}</Text>

        {errorKey ? <Text style={styles.error}>{t(errorKey)}</Text> : null}

        <View style={styles.acceptRow}>
          <Pressable
            // Without this the box is a silent, stateless target — and since
            // sign-in is gated on it, a screen-reader user could not get past
            // this screen at all.
            accessibilityLabel={t('auth.acceptPrivacyA11y')}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: privacyAccepted }}
            hitSlop={6}
            onPress={() => setPrivacyAccepted((prev) => !prev)}
            style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}
          >
            {privacyAccepted ? <Ionicons color="#FFFFFF" name="checkmark" size={13} /> : null}
          </Pressable>
          <Text style={styles.acceptText}>
            {t('auth.acceptPrivacyPrefix')}
            <Text style={styles.acceptLink} onPress={() => setPrivacyVisible(true)}>
              {t('auth.acceptPrivacyLink')}
            </Text>
            {t('auth.acceptPrivacySuffix')}
          </Text>
        </View>

        <Pressable
          disabled={signingIn || !isSupabaseConfigured || !privacyAccepted}
          onPress={() => void handleGoogleSignIn()}
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.pressed,
            (signingIn || !isSupabaseConfigured || !privacyAccepted) && styles.disabled,
          ]}
        >
          {signingIn ? (
            <ActivityIndicator color="#1F1F1F" size="small" />
          ) : (
            <View style={styles.googleIconWrap}>
              <Ionicons color="#4285F4" name="logo-google" size={18} />
            </View>
          )}
          <Text style={styles.googleButtonText}>{t('auth.signInWithGoogle')}</Text>
        </Pressable>

        {Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={14}
            style={[styles.appleButton, (signingIn || !privacyAccepted) && styles.disabled]}
            onPress={() => {
              if (!signingIn && privacyAccepted) {
                void handleAppleSignIn();
              }
            }}
          />
        ) : null}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          disabled={signingIn || !privacyAccepted}
          onPress={handleContinueAsGuest}
          style={({ pressed }) => [
            styles.guestButton,
            pressed && styles.pressed,
            !privacyAccepted && styles.disabled,
          ]}
        >
          <Ionicons color={colors.textSecondary} name="person-outline" size={17} />
          <Text style={styles.guestButtonText}>{t('auth.continueAsGuest')}</Text>
        </Pressable>

        <Text style={styles.guestHint}>{t('auth.guestHint')}</Text>
      </View>

      <PrivacyPolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  body: {
    alignItems: 'center',
    flex: 1,
    // Anchored to the top rather than vertically centred: centring left the
    // logo floating in the middle of the screen with dead space above it.
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  logo: {
    // The artwork is drawn on pure black while this screen is #0D0D0D, so the
    // image's square edge is faintly visible against it. Rounding turns an
    // accidental hard corner into a deliberate tile instead.
    borderRadius: 34,
    height: 172,
    // Tight to the greeting — the two read as one unit.
    marginBottom: 6,
    width: 172,
  },
  welcome: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 32,
    textAlign: 'center',
  },
  languageList: {
    gap: 10,
    width: '100%',
  },
  languageCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  languageFlag: {
    fontSize: 26,
  },
  languageLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E4E7',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 14,
    width: '100%',
  },
  googleIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#1F1F1F',
    fontSize: 15,
    fontWeight: '700',
  },
  appleButton: {
    height: 48,
    marginTop: 10,
    width: '100%',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginVertical: 18,
    width: '100%',
  },
  dividerLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  guestButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 13,
    width: '100%',
  },
  guestButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  guestHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  acceptRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
    paddingHorizontal: 4,
    width: '100%',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 5,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    marginTop: 1,
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  acceptText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  acceptLink: {
    color: colors.accent,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
