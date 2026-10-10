import { FC, ReactNode } from 'react';
import { IconFlag, IconFlagFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { posLabel } from '@/utils/partOfSpeech';

interface DefinitionHeaderProps {
  word: ReactNode;
  pos: string;
  flagged: boolean;
  onToggleFlag: () => void;
}

/** The word, its part of speech, and the button to flag a bad definition. */
export const DefinitionHeader: FC<DefinitionHeaderProps> = ({
  word,
  pos,
  flagged,
  onToggleFlag,
}) => {
  const { t } = useTranslation();
  return (
    <Group justify="space-between" align="center">
      <Group gap={6} align="baseline">
        {word}
        <Text size="xs" c="dimmed" fs="italic">
          ({posLabel(pos)})
        </Text>
      </Group>
      <Tooltip label={flagged ? t('game.unflagWord') : t('game.flagWord')}>
        <ActionIcon
          size="xs"
          variant={flagged ? 'filled' : 'light'}
          color="red"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFlag();
          }}
        >
          {flagged ? <IconFlagFilled size={12} /> : <IconFlag size={12} />}
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};
