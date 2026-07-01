import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import tr from './locales/tr.json';

export const LANGUAGE_STORAGE_KEY = '@bioband/language';

const resources = {
  tr: { translation: tr },
  en: { translation: en },
};

function getDeviceLanguage(): 'tr' | 'en' {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'en';
  return locale.startsWith('tr') ? 'tr' : 'en';
}

export async function getStoredLanguage(): Promise<'tr' | 'en' | null> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'tr' || stored === 'en') {
    return stored;
  }
  return null;
}

export async function saveLanguage(language: 'tr' | 'en'): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export async function initI18n(): Promise<void> {
  const stored = await getStoredLanguage();
  const language = stored ?? getDeviceLanguage();

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
