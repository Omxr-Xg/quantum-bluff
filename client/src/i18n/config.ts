import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationFR from './locales/fr/translation.json';
import translationES from './locales/es/translation.json';
import translationAR from './locales/ar/translation.json';
import translationUK from './locales/uk/translation.json';

const resources = {
  en: { translation: translationEN },
  fr: { translation: translationFR },
  es: { translation: translationES },
  ar: { translation: translationAR },
  uk: { translation: translationUK }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// RTL support for Arabic
function applyDir(lng: string) {
  document.documentElement.dir = lng?.startsWith('ar') ? 'rtl' : 'ltr';
  document.documentElement.lang = lng || 'en';
}
i18n.on('languageChanged', applyDir);
applyDir(i18n.language || i18n.resolvedLanguage || 'en');

export default i18n;
