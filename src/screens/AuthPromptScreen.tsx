import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { syncAfterSignIn } from '../auth/useAuthSession';
import { signInWithGoogle } from '../auth/googleAuth';
import { ScreenContainer } from '../components/ScreenContainer';
import i18n, { saveLanguage, type AppLanguage } from '../i18n';
import { markOnboardingPromptSeen } from '../storage/appDataKeys';
import { isSupabaseConfigured } from '../supabase/client';
import { colors } from '../theme/colors';

type Props = {
  onDone: () => void;
};

type Step = 'language' | 'auth';

const LANGUAGES: { code: AppLanguage; label: string; flag: string }[] = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export function AuthPromptScreen({ onDone }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('language');
  const [signingIn, setSigningIn] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

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
        await syncAfterSignIn(result.session.user.id);
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
          <View style={styles.iconWrap}>
            <Ionicons color={colors.accent} name="musical-notes" size={40} />
          </View>
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

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons color={colors.accent} name="musical-notes" size={40} />
        </View>
        <Text style={styles.title}>{t('auth.promptTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.promptSubtitle')}</Text>

        {errorKey ? <Text style={styles.error}>{t(errorKey)}</Text> : null}

        <Pressable
          disabled={signingIn || !isSupabaseConfigured}
          onPress={() => void handleGoogleSignIn()}
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.pressed,
            (signingIn || !isSupabaseConfigured) && styles.disabled,
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

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          disabled={signingIn}
          onPress={handleContinueAsGuest}
          style={({ pressed }) => [styles.guestButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textSecondary} name="person-outline" size={17} />
          <Text style={styles.guestButtonText}>{t('auth.continueAsGuest')}</Text>
        </Pressable>

        <Text style={styles.guestHint}>{t('auth.guestHint')}</Text>
      </View>
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
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 44,
    borderWidth: 1,
    height: 88,
    justifyContent: 'center',
    marginBottom: 24,
    width: 88,
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
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
