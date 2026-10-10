import type { Language } from '@/types/firestore';

/** Interface languages; the same five as the game's (not imported, since `languages.ts` uses i18n). */
export const UI_LANGUAGES = ['en', 'es', 'fr', 'it', 'pt'] as const satisfies readonly Language[];

/** The interface language a player picked, on this device. */
export const SAVED_KEY = 'polyglot_ui_language';
/** The language a shared link asked for, kept through the sign-in redirect. */
const LINK_KEY = 'polyglot_link_language';
const LANG_PARAM = 'lang';
export const DEFAULT_UI_LANGUAGE: Language = 'en';

/** Each language's name in that language, for the picker. */
export const NATIVE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
};

const isUiLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (UI_LANGUAGES as readonly string[]).includes(value);

/** `es-GT` → `es`; null when none of the browser's languages is supported. */
export const fromBrowserLanguages = (languages: readonly string[]): Language | null => {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isUiLanguage(base)) {
      return base;
    }
  }
  return null;
};

export type UiLanguageSource = 'saved' | 'link' | 'browser' | 'default';

/** A saved choice wins, then a shared link's language, then the browser's. */
export const chooseUiLanguage = ({
  saved,
  link,
  browser,
}: {
  saved?: string | null;
  link?: string | null;
  browser?: readonly string[];
}): { language: Language; source: UiLanguageSource } => {
  if (isUiLanguage(saved)) {
    return { language: saved, source: 'saved' };
  }
  if (isUiLanguage(link)) {
    return { language: link, source: 'link' };
  }
  const fromBrowser = fromBrowserLanguages(browser ?? []);
  if (fromBrowser) {
    return { language: fromBrowser, source: 'browser' };
  }
  return { language: DEFAULT_UI_LANGUAGE, source: 'default' };
};

const read = (storage: () => Storage, key: string) => {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
};

const write = (storage: () => Storage, key: string, value: string) => {
  try {
    storage().setItem(key, value);
  } catch {
    // Without storage the choice lasts for this page load only.
  }
};

export const readSavedUiLanguage = (): Language | null => {
  const saved = read(() => localStorage, SAVED_KEY);
  return isUiLanguage(saved) ? saved : null;
};

export const saveUiLanguageLocally = (language: Language) =>
  write(() => localStorage, SAVED_KEY, language);

/** The `?lang=` on this page load, remembered for the session so sign-in doesn't lose it. */
export const readLinkLanguage = (): string | null => {
  const fromUrl =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get(LANG_PARAM);
  if (isUiLanguage(fromUrl)) {
    write(() => sessionStorage, LINK_KEY, fromUrl);
    return fromUrl;
  }
  return read(() => sessionStorage, LINK_KEY);
};

export const detectUiLanguage = () =>
  chooseUiLanguage({
    saved: readSavedUiLanguage(),
    link: readLinkLanguage(),
    browser: typeof navigator === 'undefined' ? [] : navigator.languages,
  });
