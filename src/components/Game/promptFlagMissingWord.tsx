import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { flagWord } from '@/hooks/useFlaggedWords';
import { getStoredFlags } from '@/hooks/useLanguageFlags';
import type { Language } from '@/types/firestore';
import { labelFor } from '@/utils/languages';
import { showToast } from '@/utils/toast';

/** Asks whether a guess should be flagged as missing from one of `languages`' dictionaries. */
export const promptFlagMissingWord = (word: string, languages: Language[]) => {
  const id = `flag-missing-${word}`;
  const upper = word.toUpperCase();
  const flags = getStoredFlags();
  showToast(
    {
      id,
      title: `Is ${upper} a real word?`,
      color: 'orange',
      autoClose: 12000,
      message: (
        <>
          <Text size="sm" mb={6}>
            Flag it as missing from:
          </Text>
          <Group gap={6}>
            {languages.map((lang) => (
              <Button
                key={lang}
                size="compact-xs"
                variant="light"
                color="orange"
                onClick={() => {
                  flagWord({ lang, wordKey: word, note: 'Missing word (rejected as a guess)' });
                  notifications.update({
                    id,
                    title: `Flagged ${upper}`,
                    message: `Marked as missing from ${labelFor(lang)}. Thanks!`,
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
