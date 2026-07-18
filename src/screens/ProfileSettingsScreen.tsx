import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '../components/ScreenContainer';
import i18n, { saveLanguage } from '../i18n';
import {
  DEFAULT_PROFILE_SETTINGS,
  loadProfileSettings,
  saveProfileSettings,
  type ProfileSettings,
} from '../storage/profileSettingsStorage';
import { colors } from '../theme/colors';
import type { InstrumentId } from '../types/recording';
import type { ProfileStackParamList } from '../types/navigation';
import { INSTRUMENT_TITLE_KEYS } from '../utils/recordingLabels';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileSettings'>;

const INSTRUMENTS: InstrumentId[] = ['piano', 'drums', 'guitar', 'violin', 'pads'];

export function ProfileSettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_PROFILE_SETTINGS);
  const currentLang = i18n.language === 'tr' ? 'tr' : 'en';

  useEffect(() => {
    void loadProfileSettings().then((value) => {
      setSettings(value);
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (next: ProfileSettings) => {
    setSaving(true);
    try {
      setSettings(await saveProfileSettings(next));
    } finally {
      setSaving(false);
    }
  }, []);

  const setLanguage = async (language: 'tr' | 'en') => {
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
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('profile.settingsPersonal')}</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('profile.displayName')}</Text>
          <TextInput
            maxLength={40}
            placeholder={t('profile.displayNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={settings.displayName}
            onBlur={() => void persist(settings)}
            onChangeText={(displayName) => setSettings((prev) => ({ ...prev, displayName }))}
          />
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
      </ScrollView>
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
