import React, { FC } from 'react';
import { IconCheck, IconFlag, IconRefresh } from '@tabler/icons-react';
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
import { DEFAULT_FLAGS, useLanguageFlags } from '@/hooks/useLanguageFlags';
import { Language } from '@/types/firestore';
import { extractSingleEmoji } from '@/utils/emojiUtils';

interface FlagsModalProps {
  opened: boolean;
  onClose: () => void;
}

const PRESETS: Record<Language, string[]> = {
  en: ['🇬🇧', '🇺🇸', '🇨🇦', '🇦🇺', '🇳🇿', '🇮🇪', '🇮🇳', '🇿🇦', '🇯🇲', '🇸🇬', '🇳🇬', '🇵🇭'],
  es: ['🇪🇸', '🇲🇽', '🇦🇷', '🇨🇴', '🇨🇱', '🇵🇪', '🇻🇪', '🇨🇷', '🇩🇴', '🇪🇨', '🇬🇹', '🇺🇾'],
  fr: ['🇫🇷', '🇨🇦', '🇧🇪', '🇨🇭', '🇸🇳', '🇨🇮', '🇲🇨', '🇭🇹', '🇲🇬', '🇨🇲', '🇩🇿', '🇲🇦'],
};

export const FlagsModal: FC<FlagsModalProps> = ({ opened, onClose }) => {
  const { flags, setFlag, resetFlags } = useLanguageFlags();

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
            Language Flag & Emoji Customization
          </Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          Choose any flag or emoji to represent each language across the game boards and column
          deduction tags. (Presets contain country flags, but custom inputs accept any single emoji).
        </Text>

        <Paper p="xs" withBorder radius="md" bg="var(--mantine-color-dark-8)">
          <Text size="xs" fw={700} c="dimmed" mb={6}>
            LIVE PREVIEW
          </Text>
          <Group justify="center" gap="sm">
            {(['en', 'es', 'fr'] as const).map((lang) => (
              <Badge key={lang} size="lg" variant="filled" color="indigo">
                <Text span me={5}>
                  {flags[lang]}
                </Text>
                {lang.toUpperCase()}
              </Badge>
            ))}
          </Group>
        </Paper>

        {(['en', 'es', 'fr'] as const).map((lang) => {
          const langName = lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : 'French';

          return (
            <Paper key={lang} p="xs" withBorder radius="md" bg="var(--mantine-color-dark-8)">
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text size="sm" fw={700}>
                    {langName} ({lang.toUpperCase()})
                  </Text>
                  <Text size="lg">{flags[lang]}</Text>
                </Group>

                <TextInput
                  size="xs"
                  placeholder="Paste or type any single flag or emoji..."
                  value={flags[lang]}
                  description="Only 1 emoji symbol allowed (flag or any emoji)"
                  onChange={(e) => {
                    const extracted = extractSingleEmoji(e.currentTarget.value);
                    if (extracted) {
                      setFlag(lang, extracted);
                    }
                  }}
                />

                <Group gap={4} wrap="wrap" mt={4}>
                  <Text size="xs" c="dimmed" me={4}>
                    Flag Presets:
                  </Text>
                  {PRESETS[lang].map((preset) => (
                    <Tooltip key={preset} label={`Use ${preset}`}>
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
          );
        })}

        <Group justify="space-between" mt="xs">
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconRefresh size={14} />}
            onClick={resetFlags}
          >
            Reset Defaults ({DEFAULT_FLAGS.en} {DEFAULT_FLAGS.es} {DEFAULT_FLAGS.fr})
          </Button>

          <Button
            size="xs"
            color="blue"
            leftSection={<IconCheck size={14} />}
            onClick={onClose}
          >
            Done
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
