import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { flagWord, MISSING_WORD_NOTE } from '@/hooks/useFlaggedWords';
import { getStoredFlags } from '@/hooks/useLanguageFlags';
import i18n from '@/i18n';
import type { Language } from '@/types/firestore';
import { labelFor } from '@/utils/languages';
import { showToast } from '@/utils/toast';

/** Asks whether a guess should be flagged as missing from one of `languages`' dictionaries. */
export const promptFlagMissingWord = (word: string, languages: Language[]) => {
  const id = `flag-missing-${word}`;
  const upper = word.toUpperCase();
  const flags = getStoredFlags();
  const t = i18n.t.bind(i18n);
  showToast(
    {
      id,
      title: t('game.missingWord.title', { word: upper }),
      color: 'orange',
      autoClose: 12000,
      message: (
        <>
          <Text size="sm" mb={6}>
            {t('game.missingWord.prompt')}
          </Text>
          <Group gap={6}>
            {languages.map((lang) => (
              <Button
                key={lang}
                size="compact-xs"
                variant="light"
                color="orange"
                onClick={() => {
                  flagWord({ lang, wordKey: word, note: MISSING_WORD_NOTE, reason: 'missing' });
                  notifications.update({
                    id,
                    title: t('game.missingWord.flagged', { word: upper }),
                    message: t('game.missingWord.thanks', { language: labelFor(lang) }),
                    color: 'teal',
                    autoClose: 3000,
                  });
                }}
              >
                {flags[lang]} {labelFor(lang)}
              </Button>
            ))}
          </Group>
        </>
      ),
    },
    { immediate: true }
  );
};
