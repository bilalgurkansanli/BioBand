import * as AppleAuthentication from 'expo-apple-authentication';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { ScreenContainer } from '../components/ScreenContainer';
import i18n, { saveLanguage, type AppLanguage } from '../i18n';
import { signInWithApple } from '../auth/appleAuth';
import { signInWithGoogle } from '../auth/googleAuth';
import { syncAfterSignIn, useAuthSession } from '../auth/useAuthSession';
import { ProfileAvatar } from '../components/ProfileAvatar';
import {
  cancelDailyPracticeReminder,
  requestNotificationPermission,
  scheduleDailyPracticeReminder,
} from '../notifications/practiceReminder';
import {
  DEFAULT_PROFILE_SETTINGS,
  loadProfileSettings,
  saveProfileSettings,
  type ProfileSettings,
} from '../storage/profileSettingsStorage';
import {
  DEFAULT_PRACTICE_REMINDER_SETTINGS,
  loadPracticeReminderSettings,
  savePracticeReminderSettings,
  type PracticeReminderSettings,
} from '../storage/practiceReminderStorage';
import { colors } from '../theme/colors';
import type { InstrumentId } from '../types/recording';
import type { ProfileStackParamList } from '../types/navigation';
import { INSTRUMENT_TITLE_KEYS } from '../utils/recordingLabels';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileSettings'>;

const INSTRUMENTS: InstrumentId[] = ['piano', 'drums', 'guitar', 'violin', 'pads'];
const REMINDER_HOURS = [7, 8, 12, 17, 19, 20, 21, 22];

function formatHourLabel(hour: number): string {
  return `${hour < 10 ? `0${hour}` : hour}:00`;
}

export function ProfileSettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_PROFILE_SETTINGS);
  const [reminder, setReminder] = useState<PracticeReminderSettings>(
    DEFAULT_PRACTICE_REMINDER_SETTINGS,
  );
  const [reminderPermissionDenied, setReminderPermissionDenied] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signOutConfirmVisible, setSignOutConfirmVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const currentLang: AppLanguage =
    i18n.language === 'tr' ? 'tr' : i18n.language === 'de' ? 'de' : 'en';
  const { user, isSignedIn, signOut } = useAuthSession();

  const handleSignIn = useCallback(async () => {
    setSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (result.ok) {
        await syncAfterSignIn(result.session.user.id, result.googleProfile);
        const [nextSettings, nextReminder] = await Promise.all([
          loadProfileSettings(),
          loadPracticeReminderSettings(),
        ]);
        setSettings(nextSettings);
        setReminder(nextReminder);
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const handleAppleSignIn = useCallback(async () => {
    setSigningIn(true);
    try {
      const result = await signInWithApple();
      if (result.ok) {
        await syncAfterSignIn(result.session.user.id, result.appleProfile);
        const [nextSettings, nextReminder] = await Promise.all([
          loadProfileSettings(),
          loadPracticeReminderSettings(),
        ]);
        setSettings(nextSettings);
        setReminder(nextReminder);
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadProfileSettings(), loadPracticeReminderSettings()]).then(
      ([profileValue, reminderValue]) => {
        setSettings(profileValue);
        setReminder(reminderValue);
        setLoading(false);
      },
    );
  }, []);

  const persist = useCallback(async (next: ProfileSettings) => {
    setSaving(true);
    try {
      setSettings(await saveProfileSettings(next));
    } finally {
      setSaving(false);
    }
  }, []);

  const reminderNotificationCopy = {
    title: t('profile.reminderNotifTitle'),
    body: t('profile.reminderNotifBody'),
  };

  const persistReminder = useCallback(async (next: PracticeReminderSettings) => {
    setSaving(true);
    try {
      setReminder(await savePracticeReminderSettings(next));
    } finally {
      setSaving(false);
    }
  }, []);

  const onToggleReminder = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setReminderPermissionDenied(true);
        return;
      }
      setReminderPermissionDenied(false);
      const next = { ...reminder, enabled: true };
      await persistReminder(next);
      await scheduleDailyPracticeReminder(
        next.hour,
        next.minute,
        reminderNotificationCopy.title,
        reminderNotificationCopy.body,
      );
      return;
    }
    await persistReminder({ ...reminder, enabled: false });
    await cancelDailyPracticeReminder();
  };

  const onSelectReminderHour = async (hour: number) => {
    const next = { ...reminder, hour, minute: 0 };
    await persistReminder(next);
    if (next.enabled) {
      await scheduleDailyPracticeReminder(
        next.hour,
        next.minute,
        reminderNotificationCopy.title,
        reminderNotificationCopy.body,
      );
    }
  };

  const setLanguage = async (language: AppLanguage) => {
    if (language === currentLang) {
      return;
    }
    await i18n.changeLanguage(language);
    await saveLanguage(language);
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.title}>{t('profile.settingsTitle')}</Text>
        {saving ? <ActivityIndicator color={colors.accent} /> : <View style={styles.spacer} />}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>{t('profile.title')}</Text>
        <View style={styles.card}>
          {isSignedIn ? (
            <>
              <View style={styles.accountRow}>
                <ProfileAvatar
                  displayName={settings.displayName || user?.email || ''}
                  photoUrl={settings.avatarPhotoUrl}
                  size={44}
                />
                <View style={styles.accountInfo}>
                  <Text numberOfLines={1} style={styles.accountEmail}>
                    {user?.email ?? ''}
                  </Text>
                  <View style={styles.accountBadge}>
                    <Ionicons color={colors.accent} name="cloud-done-outline" size={13} />
                    <Text style={styles.accountBadgeText}>{t('auth.syncedBadge')}</Text>
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => setSignOutConfirmVisible(true)}
                style={({ pressed }) => [styles.signOutRow, pressed && styles.pressed]}
              >
                <View style={styles.signOutIconWrap}>
                  <Ionicons color={colors.error} name="log-out-outline" size={18} />
                </View>
                <Text style={styles.signOutBtnText}>{t('auth.signOut')}</Text>
                <Ionicons color={colors.textSecondary} name="chevron-forward" size={16} />
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.hint}>{t('auth.signInSettingsHint')}</Text>
              <Pressable
                disabled={signingIn}
                onPress={() => void handleSignIn()}
                style={({ pressed }) => [
                  styles.googleSignInBtn,
                  pressed && styles.pressed,
                  signingIn && styles.disabled,
                ]}
              >
                {signingIn ? (
                  <ActivityIndicator color="#1F1F1F" size="small" />
                ) : (
                  <Ionicons color="#1F1F1F" name="logo-google" size={18} />
                )}
                <Text style={styles.googleSignInBtnText}>{t('auth.signInWithGoogle')}</Text>
              </Pressable>
              {Platform.OS === 'ios' ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={10}
                  style={[styles.appleSignInBtn, signingIn && styles.disabled]}
                  onPress={() => {
                    if (!signingIn) {
                      void handleAppleSignIn();
                    }
                  }}
                />
              ) : null}
            </>
          )}
          <Text style={styles.localDataHint}>{t('auth.localDataHint')}</Text>
        </View>

        <Text style={styles.sectionLabel}>{t('profile.settingsLanguage')}</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>{t('profile.settingsLanguageHint')}</Text>
          <View style={styles.langRow}>
            <LangChip
              active={currentLang === 'tr'}
              label={t('profile.langTr')}
              onPress={() => void setLanguage('tr')}
            />
            <LangChip
              active={currentLang === 'en'}
              label={t('profile.langEn')}
              onPress={() => void setLanguage('en')}
            />
            <LangChip
              active={currentLang === 'de'}
              label={t('profile.langDe')}
              onPress={() => void setLanguage('de')}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('profile.settingsPersonal')}</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('profile.displayName')}</Text>
          <View style={styles.avatarPreviewRow}>
            <ProfileAvatar
              displayName={settings.displayName}
              photoUrl={settings.avatarPhotoUrl}
              size={40}
            />
            <TextInput
              maxLength={40}
              placeholder={t('profile.displayNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.avatarPreviewInput]}
              value={settings.displayName}
              onBlur={() => void persist(settings)}
              onChangeText={(displayName) => setSettings((prev) => ({ ...prev, displayName }))}
            />
          </View>
          <Text style={styles.fieldLabel}>{t('profile.favoriteInstrument')}</Text>
          <Text style={styles.hint}>{t('profile.favoriteInstrumentHint')}</Text>
          <View style={styles.chipWrap}>
            <Chip
              active={settings.favoriteInstrument === null}
              label={t('profile.favoriteNone')}
              onPress={() => {
                const next = { ...settings, favoriteInstrument: null };
                setSettings(next);
                void persist(next);
              }}
            />
            {INSTRUMENTS.map((instrument) => (
              <Chip
                key={instrument}
                active={settings.favoriteInstrument === instrument}
                label={t(INSTRUMENT_TITLE_KEYS[instrument])}
                onPress={() => {
                  const next = { ...settings, favoriteInstrument: instrument };
                  setSettings(next);
                  void persist(next);
                }}
              />
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('profile.reminderTitle')}</Text>
        <View style={styles.card}>
          <View style={styles.reminderToggleRow}>
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>{t('profile.reminderEnable')}</Text>
              <Text style={styles.hint}>{t('profile.reminderHint')}</Text>
            </View>
            <Switch
              onValueChange={(value) => void onToggleReminder(value)}
              thumbColor="#FFFFFF"
              trackColor={{ false: colors.surfaceLight, true: colors.accent }}
              value={reminder.enabled}
            />
          </View>
          {reminder.enabled ? (
            <View style={styles.chipWrap}>
              {REMINDER_HOURS.map((hour) => (
                <Chip
                  active={reminder.hour === hour}
                  key={hour}
                  label={formatHourLabel(hour)}
                  onPress={() => void onSelectReminderHour(hour)}
                />
              ))}
            </View>
          ) : null}
          {reminderPermissionDenied ? (
            <Text style={styles.reminderWarning}>
              {t('profile.reminderPermissionDenied')}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>{t('common.about')}</Text>
        <View style={styles.card}>
          <Pressable
            onPress={() => setPrivacyVisible(true)}
            style={({ pressed }) => [styles.privacyRow, pressed && styles.pressed]}
          >
            <Ionicons color={colors.textSecondary} name="shield-checkmark-outline" size={18} />
            <Text style={styles.privacyRowText}>{t('common.privacyPolicy')}</Text>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={16} />
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmDeleteModal
        cancelLabel={t('common.cancel')}
        confirmLabel={t('auth.signOut')}
        icon="log-out-outline"
        message={t('auth.signOutConfirmMessage')}
        title={t('auth.signOutConfirmTitle')}
        visible={signOutConfirmVisible}
        onCancel={() => setSignOutConfirmVisible(false)}
        onConfirm={() => {
          setSignOutConfirmVisible(false);
          void signOut();
        }}
      />

      <PrivacyPolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
    </ScreenContainer>
  );
}

function LangChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.langChip, active && styles.langChipActive]}
    >
      <Text style={[styles.langChipText, active && styles.langChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  spacer: {
    width: 24,
  },
  scroll: {
    paddingBottom: 32,
  },
  googleSignInBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 12,
  },
  appleSignInBtn: {
    height: 44,
    marginTop: 10,
  },
  googleSignInBtnText: {
    color: '#1F1F1F',
    fontSize: 14,
    fontWeight: '700',
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  accountInfo: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  accountEmail: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  accountBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${colors.accent}18`,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  accountBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  signOutRow: {
    alignItems: 'center',
    backgroundColor: `${colors.error}14`,
    borderColor: `${colors.error}33`,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  signOutIconWrap: {
    alignItems: 'center',
    backgroundColor: `${colors.error}22`,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  signOutBtnText: {
    color: colors.error,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  privacyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  privacyRowText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  flex: {
    flex: 1,
  },
  reminderToggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  reminderWarning: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  localDataHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langChip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  langChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  langChipText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  langChipTextActive: {
    color: '#FFFFFF',
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatarPreviewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  avatarPreviewInput: {
    flex: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
