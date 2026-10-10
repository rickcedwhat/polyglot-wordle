import { afterEach, describe, expect, it } from 'vitest';
import { gamePath } from '@/utils/languages';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { it as itStrings } from './locales/it';
import { pt } from './locales/pt';
import { chooseUiLanguage, fromBrowserLanguages, readLinkLanguage } from './uiLanguage';

describe('chooseUiLanguage', () => {
  it('prefers a saved choice over a link and the browser', () => {
    expect(chooseUiLanguage({ saved: 'fr', link: 'es', browser: ['it-IT'] })).toEqual({
      language: 'fr',
      source: 'saved',
    });
  });

  it("uses a shared link's language when nothing is saved", () => {
    expect(chooseUiLanguage({ saved: null, link: 'es', browser: ['en-US'] })).toEqual({
      language: 'es',
      source: 'link',
    });
  });

  it('falls back to the first supported browser language, then English', () => {
    expect(chooseUiLanguage({ browser: ['de-DE', 'es-GT'] }).language).toBe('es');
    expect(chooseUiLanguage({ browser: ['de-DE'] })).toEqual({ language: 'en', source: 'default' });
  });

  it('ignores unsupported values', () => {
    expect(chooseUiLanguage({ saved: 'de', link: 'xx', browser: [] }).language).toBe('en');
    expect(fromBrowserLanguages(['PT-br'])).toBe('pt');
  });
});

describe('readLinkLanguage', () => {
  afterEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('remembers the link language after the URL loses it, as after sign-in', () => {
    window.history.replaceState(null, '', '/game/abc?lang=es');
    expect(readLinkLanguage()).toBe('es');
    window.history.replaceState(null, '', '/login');
    expect(readLinkLanguage()).toBe('es');
  });
});

describe('gamePath', () => {
  it("adds the sharer's language next to the challenger", () => {
    expect(gamePath('abc', null, { challenger: 'u1', lang: 'es' })).toBe(
      '/game/abc?challenger=u1&lang=es'
    );
    expect(gamePath('abc', null, { lang: null })).toBe('/game/abc');
  });
});

/** `{{name}}` placeholders and `<tag>` markup, which every translation must keep. */
const tokens = (text: string) =>
  [...text.matchAll(/\{\{\w+\}\}|<\/?\w+>/g)].map(([token]) => token).sort();

const leaves = (node: object, prefix = ''): [string, string][] =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [[`${prefix}${key}`, value] as [string, string]]
      : leaves(value, `${prefix}${key}.`)
  );

describe.each([
  ['es', es],
  ['fr', fr],
  ['it', itStrings],
  ['pt', pt],
])('%s translation', (_, strings) => {
  const english = Object.fromEntries(leaves(en));

  it.each(leaves(strings))('%s keeps the placeholders and is not empty', (key, text) => {
    expect(text.trim()).not.toBe('');
    expect(tokens(text)).toEqual(tokens(english[key]));
  });
});
