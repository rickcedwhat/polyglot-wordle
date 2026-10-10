import { FC } from 'react';
import { Box, Container, Group, Stack } from '@mantine/core';
import { useLetterStatus } from '@/hooks/useLetterStatus';
import { AlphabetKey } from '../AlphabetKey/AlphabetKey';

interface AlphabetStatusProps {
  onKeyPress: (key: string) => void;
  activeKey: string | null;
}

/** Letter keys per row, plus the action key (if any) at the end of the row and its width. */
const ROWS: { letters: string[]; action?: { key: string; label: string; flex: number } }[] = [
  { letters: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] },
  {
    letters: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    action: { key: 'enter', label: '⏎', flex: 1.5 },
  },
  {
    letters: ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
    action: { key: 'del', label: '←', flex: 1 },
  },
];

export const AlphabetStatus: FC<AlphabetStatusProps> = ({ onKeyPress, activeKey }) => {
  const { letterStatusMap } = useLetterStatus();

  return (
    <Container mt="xs" mb={0} p={0} w="100%" style={{ maxWidth: 600 }}>
      <Stack gap={8}>
        {ROWS.map(({ letters, action }) => (
          <Group key={letters[0]} gap="1.5%" wrap="nowrap">
            {letters.map((key) => (
              <Box key={key} style={{ flex: 1 }}>
                <AlphabetKey
                  activeKey={activeKey}
                  onClick={() => onKeyPress(key)}
                  letter={key}
                  statuses={letterStatusMap[key] || ['empty', 'empty', 'empty']}
                />
              </Box>
            ))}
            {action && (
              <Box style={{ flex: action.flex }}>
                <AlphabetKey
                  activeKey={activeKey}
                  onClick={() => onKeyPress(action.key)}
                  letter={action.label}
                />
              </Box>
            )}
          </Group>
        ))}
      </Stack>
    </Container>
  );
};
