import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import { en } from '@/i18n/locales/en';
import { es } from '@/i18n/locales/es';
import { fr } from '@/i18n/locales/fr';
import { it as italian } from '@/i18n/locales/it';
import { pt } from '@/i18n/locales/pt';

it.each([
  ['en', en, '1 new', '2 new'],
  ['es', es, '1 nueva', '2 nuevas'],
  ['fr', fr, '1 nouvelle', '2 nouvelles'],
  ['it', italian, '1 nuova', '2 nuove'],
  ['pt', pt, '1 nova', '2 novas'],
] as const)(
  'uses singular and plural unread badge copy in %s',
  async (lng, translation, singular, plural) => {
    const instance = createInstance();
    await instance.init({ lng, resources: { [lng]: { translation } }, initAsync: false });
    expect(instance.t('activity.notifications.new', { count: 1 })).toBe(singular);
    expect(instance.t('activity.notifications.new', { count: 2 })).toBe(plural);
  }
);
