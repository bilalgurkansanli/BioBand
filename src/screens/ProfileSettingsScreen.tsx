import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { AppleSignInButton } from '../components/AppleSignInButton';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { CreditsModal } from '../components/CreditsModal';
import { CrashLogModal } from '../components/CrashLogModal';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { TimePickerModal } from '../components/TimePickerModal';
import { OptionListModal } from '../components/studio/OptionListModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { ScreenContainer } from '../components/ScreenContainer';
import i18n, { saveLanguage, type AppLanguage } from '../i18n';
import { Toast } from '../components/Toast';
import { loadCrashLog } from '../diagnostics/crashLog';
import { useLibraryBackup } from '../hooks/useLibraryBackup';
import { signInWithApple } from '../auth/appleAuth';
import { deleteAccount } from '../auth/deleteAccount';
import {
  DEFAULT_RECORDING_UI_SETTINGS,
  loadRecordingSettings,
  saveRecordingSettings,
} from '../storage/recordingSettingsStorage';
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
  WEEKLY_GOAL_OPTIONS,
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

function formatTimeLabel(hour: number, minute: number): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(hour)}:${pad(minute)}`;
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
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountErrorKey, setDeleteAccountErrorKey] = useState<string | null>(null);
  const [crashCount, setCrashCount] = useState(0);
  const [crashLogVisible, setCrashLogVisible] = useState(false);
  const {
    job: backupJob,
    feedback: backupFeedback,
    dismissFeedback: dismissBackupFeedback,
    backup,
    exportAudio,
    restore,
  } = useLibraryBackup();
  const [backupFormatVisible, setBackupFormatVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [countInEnabled, setCountInEnabled] = useState(
    DEFAULT_RECORDING_UI_SETTINGS.countInEnabled,
  );

  useEffect(() => {
    let active = true;
    void loadRecordingSettings().then((settings) => {
      if (active) {
        setCountInEnabled(settings.countInEnabled);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [creditsVisible, setCreditsVisible] = useState(false);
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

  const handleDeleteAccount = useCallback(async () => {
    setDeleteAccountErrorKey(null);
    setDeletingAccount(true);
    try {
      const result = await deleteAccount(signOut);
      if (result.ok) {
        // The sign-out inside deleteAccount remounts the navigation tree, so
        // there is no screen left to close — just leave the sheet shut in case
        // this one is still mounted when the remount lands.
        setDeleteAccountVisible(false);
        return;
      }
      setDeleteAccountErrorKey(`auth.deleteAccountErrors.${result.code}`);
    } finally {
      setDeletingAccount(false);
    }
  }, [signOut]);

  // Only the count is needed here — the records themselves are read when the
  // sheet actually opens.
  useEffect(() => {
    void loadCrashLog().then((records) => setCrashCount(records.length));
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

  const onSelectReminderTime = async (hour: number, minute: number) => {
    const next = { ...reminder, hour, minute };
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
              {/* Deliberately plainer than the sign-out button above: store
                  policy requires this path to exist and be findable, not to
                  compete with the action almost everyone actually wants. */}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDeleteAccountErrorKey(null);
                  setDeleteAccountVisible(true);
                }}
                style={({ pressed }) => [styles.deleteAccountRow, pressed && styles.pressed]}
              >
                <Ionicons color={colors.error} name="trash-outline" size={15} />
                <Text style={styles.deleteAccountText}>{t('auth.deleteAccount')}</Text>
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
              <AppleSignInButton
                cornerRadius={10}
                disabled={signingIn}
                onPress={() => void handleAppleSignIn()}
                style={styles.appleSignInBtn}
              />
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

        <Text style={styles.sectionLabel}>{t('profile.recordingTitle')}</Text>
        <View style={styles.card}>
          <View style={styles.reminderToggleRow}>
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>{t('profile.countInEnable')}</Text>
              <Text style={styles.hint}>{t('profile.countInHint')}</Text>
            </View>
            <Switch
              onValueChange={(value) => {
                setCountInEnabled(value);
                void saveRecordingSettings({ countInEnabled: value });
              }}
              thumbColor="#FFFFFF"
              trackColor={{ false: colors.surfaceLight, true: colors.accent }}
              value={countInEnabled}
            />
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
            <Pressable
              accessibilityLabel={t('profile.reminderTimeTitle')}
              accessibilityRole="button"
              onPress={() => setTimePickerVisible(true)}
              style={({ pressed }) => [styles.reminderTimeRow, pressed && styles.pressed]}
            >
              <Ionicons color={colors.textSecondary} name="time-outline" size={18} />
              <Text style={styles.reminderTimeLabel}>{t('profile.reminderTimeLabel')}</Text>
              <Text style={styles.reminderTimeValue}>
                {formatTimeLabel(reminder.hour, reminder.minute)}
              </Text>
              <Ionicons color={colors.textSecondary} name="chevron-forward" size={16} />
            </Pressable>
          ) : null}
          {reminderPermissionDenied ? (
            <Text style={styles.reminderWarning}>
              {t('profile.reminderPermissionDenied')}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>{t('profile.weeklyGoalTitle')}</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>{t('profile.weeklyGoalHint')}</Text>
          <View style={styles.chipWrap}>
            {WEEKLY_GOAL_OPTIONS.map((minutes) => (
              <Chip
                active={settings.weeklyGoalMinutes === minutes}
                key={minutes}
                label={
                  minutes === 0
                    ? t('profile.weeklyGoalOff')
                    : t('profile.weeklyGoalOption', { minutes })
                }
                onPress={() => void persist({ ...settings, weeklyGoalMinutes: minutes })}
              />
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('backup.section')}</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>{t('backup.hint')}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={backupJob !== null}
            onPress={() => setBackupFormatVisible(true)}
            style={({ pressed }) => [
              styles.privacyRow,
              styles.backupRow,
              pressed && styles.pressed,
              backupJob !== null && styles.disabled,
            ]}
          >
            <Ionicons color={colors.textSecondary} name="save-outline" size={18} />
            <Text style={styles.privacyRowText}>{t('backup.exportAction')}</Text>
            {backupJob?.kind === 'export' || backupJob?.kind === 'audio' ? (
              <Text style={styles.backupProgress}>
                {t('common.percent', { percent: Math.round(backupJob.progress * 100) })}
              </Text>
            ) : (
              <Ionicons color={colors.textSecondary} name="chevron-forward" size={16} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={backupJob !== null}
            onPress={() => void restore()}
            style={({ pressed }) => [
              styles.privacyRow,
              styles.backupRow,
              pressed && styles.pressed,
              backupJob !== null && styles.disabled,
            ]}
          >
            <Ionicons color={colors.textSecondary} name="download-outline" size={18} />
            <Text style={styles.privacyRowText}>{t('backup.restoreAction')}</Text>
            {backupJob?.kind === 'restore' ? (
              <Text style={styles.backupProgress}>
                {t('common.percent', { percent: Math.round(backupJob.progress * 100) })}
              </Text>
            ) : (
              <Ionicons color={colors.textSecondary} name="chevron-forward" size={16} />
            )}
          </Pressable>
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

          {/* Not optional politeness: the piano samples are CC BY, which
              requires the credit to ship with the app, not just sit in the
              repository. See CreditsModal. */}
          <Pressable
            onPress={() => setCreditsVisible(true)}
            style={({ pressed }) => [styles.privacyRow, pressed && styles.pressed]}
          >
            <Ionicons color={colors.textSecondary} name="heart-outline" size={18} />
            <Text style={styles.privacyRowText}>{t('credits.screenTitle')}</Text>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={16} />
          </Pressable>

          {/* Hidden until something has actually gone wrong — a permanently
              visible "error log" invites people to go looking for trouble. */}
          {crashCount > 0 ? (
            <Pressable
              onPress={() => setCrashLogVisible(true)}
              style={({ pressed }) => [
                styles.privacyRow,
                styles.diagnosticsRow,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons color={colors.textSecondary} name="bug-outline" size={18} />
              <Text style={styles.privacyRowText}>{t('errors.diagnosticsTitle')}</Text>
              <Text style={styles.diagnosticsCount}>{crashCount}</Text>
              <Ionicons color={colors.textSecondary} name="chevron-forward" size={16} />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <TimePickerModal
        hour={reminder.hour}
        minute={reminder.minute}
        visible={timePickerVisible}
        onCancel={() => setTimePickerVisible(false)}
        onConfirm={(hour, minute) => {
          setTimePickerVisible(false);
          void onSelectReminderTime(hour, minute);
        }}
      />

      <CrashLogModal
        visible={crashLogVisible}
        onClose={() => setCrashLogVisible(false)}
        onCleared={() => setCrashCount(0)}
      />

      <OptionListModal
        message={t('backup.formatMessage')}
        options={[
          { key: 'library', label: t('backup.formatLibrary'), icon: 'archive-outline' },
          { key: 'audio', label: t('backup.formatAudio'), icon: 'musical-notes-outline' },
        ]}
        title={t('backup.formatTitle')}
        visible={backupFormatVisible}
        onClose={() => setBackupFormatVisible(false)}
        onSelect={(key) => {
          setBackupFormatVisible(false);
          if (key === 'library') {
            void backup();
          } else {
            void exportAudio();
          }
        }}
      />

      <Toast
        detail={backupFeedback?.detail}
        message={backupFeedback?.message ?? ''}
        onHide={dismissBackupFeedback}
        variant={backupFeedback?.variant}
        visible={backupFeedback !== null}
      />

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

      <DeleteAccountModal
        busy={deletingAccount}
        errorMessage={deleteAccountErrorKey ? t(deleteAccountErrorKey) : null}
        visible={deleteAccountVisible}
        onCancel={() => setDeleteAccountVisible(false)}
        onConfirm={() => void handleDeleteAccount()}
      />

      <PrivacyPolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
      <CreditsModal visible={creditsVisible} onClose={() => setCreditsVisible(false)} />
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
  deleteAccountRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingVertical: 4,
  },
  deleteAccountText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
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
  backupRow: {
    marginTop: 14,
  },
  backupProgress: {
    color: colors.accent,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  diagnosticsRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
  },
  diagnosticsCount: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 9,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 22,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: 'center',
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
  reminderTimeRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reminderTimeLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  reminderTimeValue: {
    color: colors.accent,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
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
