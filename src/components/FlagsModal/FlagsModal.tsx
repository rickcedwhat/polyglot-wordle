import { FC } from 'react';
import { IconCheck, IconFlag, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useLanguageFlags } from '@/hooks/useLanguageFlags';
import { Language } from '@/types/firestore';
import { extractSingleEmoji } from '@/utils/emojiUtils';
import { ALL_LANGUAGES, labelFor } from '@/utils/languages';

interface FlagsModalProps {
  opened: boolean;
  onClose: () => void;
}

const PRESETS: Record<Language, string[]> = {
  en: ['🇬🇧', '🇺🇸', '🇨🇦', '🇦🇺', '🇳🇿', '🇮🇪', '🇮🇳', '🇿🇦', '🇯🇲', '🇸🇬', '🇳🇬', '🇵🇭'],
  es: ['🇪🇸', '🇲🇽', '🇦🇷', '🇨🇴', '🇨🇱', '🇵🇪', '🇻🇪', '🇨🇷', '🇩🇴', '🇪🇨', '🇬🇹', '🇺🇾'],
  fr: ['🇫🇷', '🇨🇦', '🇧🇪', '🇨🇭', '🇸🇳', '🇨🇮', '🇲🇨', '🇭🇹', '🇲🇬', '🇨🇲', '🇩🇿', '🇲🇦'],
  it: ['🇮🇹', '🇨🇭', '🇸🇲', '🇻🇦'],
  pt: ['🇵🇹', '🇧🇷', '🇦🇴', '🇲🇿', '🇨🇻', '🇬🇼', '🇸🇹', '🇹🇱'],
};

export const FlagsModal: FC<FlagsModalProps> = ({ opened, onClose }) => {
  const { flags, setFlag, resetFlags } = useLanguageFlags();
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon color="indigo" variant="light" radius="xl" size="sm">
            <IconFlag size={14} />
          </ThemeIcon>
          <Text fw={700} size="md">
            {t('flags.title')}
          </Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          {t('flags.intro')}
        </Text>

        <Paper p="xs" withBorder radius="md" bg="var(--mantine-color-dark-8)">
          <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase">
            {t('flags.preview')}
          </Text>
          <Group justify="center" gap="sm">
            {ALL_LANGUAGES.map((lang) => (
              <Badge key={lang} size="lg" variant="filled" color="indigo">
                <Text span me={5}>
                  {flags[lang]}
                </Text>
                {lang.toUpperCase()}
              </Badge>
            ))}
          </Group>
        </Paper>

        {ALL_LANGUAGES.map((lang) => (
          <Paper key={lang} p="xs" withBorder radius="md" bg="var(--mantine-color-dark-8)">
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="sm" fw={700}>
                  {labelFor(lang)} ({lang.toUpperCase()})
                </Text>
                <Text size="lg">{flags[lang]}</Text>
              </Group>

              <TextInput
                size="xs"
                placeholder={t('flags.placeholder')}
                value={flags[lang]}
                description={t('flags.description')}
                onChange={(e) => {
                  const extracted = extractSingleEmoji(e.currentTarget.value);
                  if (extracted) {
                    setFlag(lang, extracted);
                  }
                }}
              />

              <Group gap={4} wrap="wrap" mt={4}>
                <Text size="xs" c="dimmed" me={4}>
                  {t('flags.presets')}
                </Text>
                {PRESETS[lang].map((preset) => (
                  <Tooltip key={preset} label={t('flags.use', { flag: preset })}>
                    <Button
                      size="compact-xs"
                      variant={flags[lang] === preset ? 'filled' : 'subtle'}
                      color={flags[lang] === preset ? 'indigo' : 'gray'}
                      onClick={() => setFlag(lang, preset)}
                    >
                      {preset}
                    </Button>
                  </Tooltip>
                ))}
              </Group>
            </Stack>
          </Paper>
        ))}

        <Group justify="space-between" mt="xs">
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconRefresh size={14} />}
            onClick={resetFlags}
          >
            {t('flags.reset')}
          </Button>

          <Button size="xs" color="blue" leftSection={<IconCheck size={14} />} onClick={onClose}>
            {t('flags.done')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
