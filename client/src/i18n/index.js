import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ar from './ar.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: localStorage.getItem('lang') || 'ar',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Keep the document title + direction in sync with the active language.
function applyDocLang() {
  document.title = i18n.t('app_title');
  document.documentElement.setAttribute('lang', i18n.language);
  document.documentElement.setAttribute('dir', i18n.language === 'ar' ? 'rtl' : 'ltr');
}
i18n.on('languageChanged', applyDocLang);
applyDocLang();

export default i18n;
