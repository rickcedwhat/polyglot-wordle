import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Language } from '@/types/firestore';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { it } from './locales/it';
import { pt } from './locales/pt';
import { DEFAULT_UI_LANGUAGE, detectUiLanguage, saveUiLanguageLocally } from './uiLanguage';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}

const detected = detectUiLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    it: { translation: it },
    pt: { translation: pt },
  },
  lng: detected.language,
  fallbackLng: DEFAULT_UI_LANGUAGE,
  interpolation: { escapeValue: false },
  initAsync: false,
});

// Language names are capitalised as labels but lowercase mid-sentence outside English: `{{language, lower}}`.
i18n.services.formatter?.add('lower', (value: string, lng) => value.toLocaleLowerCase(lng));

if (typeof document !== 'undefined') {
  document.documentElement.lang = detected.language;
}

/** Where the starting language came from; a signed-in player without a saved choice is asked once. */
export const initialUiLanguageSource = detected.source;

export const currentUiLanguage = (): Language => i18n.language as Language;

/** The `lang` for links this player shares; English is the default, so it's left off. */
export const shareLanguage = (): Language | null => {
  const language = currentUiLanguage();
  return language === DEFAULT_UI_LANGUAGE ? null : language;
};

/** Switches the interface language and remembers it on this device. */
export const setUiLanguage = async (language: Language) => {
  saveUiLanguageLocally(language);
  document.documentElement.lang = language;
  await i18n.changeLanguage(language);
};

export default i18n;
