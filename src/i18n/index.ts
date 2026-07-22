import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import tr from './locales/tr.json';

export const LANGUAGE_STORAGE_KEY = '@bioband/language';

export type AppLanguage = 'tr' | 'en' | 'de';

const resources = {
  tr: { translation: tr },
  en: { translation: en },
  de: { translation: de },
};

// First launch always starts in English — the onboarding language picker is
// the one place a user actually chooses, so there's no need to guess from
// device locale here.
const DEFAULT_LANGUAGE: AppLanguage = 'en';

export async function getStoredLanguage(): Promise<AppLanguage | null> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'tr' || stored === 'en' || stored === 'de') {
    return stored;
  }
  return null;
}

export async function saveLanguage(language: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export async function initI18n(): Promise<void> {
  const stored = await getStoredLanguage();
  const language = stored ?? DEFAULT_LANGUAGE;

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
