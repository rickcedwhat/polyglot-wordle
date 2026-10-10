import i18n from '@/i18n';

const ALIASES: Record<string, string> = { intj: 'interj', interjection: 'interj' };

/** Translates dictionary tags like "noun/verb", leaving unknown tags as they are. */
export const posLabel = (pos: string): string =>
  pos
    .split('/')
    .map((part) => {
      const key = `vocab.pos.${ALIASES[part] ?? part}`;
      return i18n.exists(key) ? i18n.t(key as 'vocab.pos.noun') : part;
    })
    .join('/');
