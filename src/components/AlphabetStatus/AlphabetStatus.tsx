import { FC } from 'react';
import { Box, Container, Group, Stack } from '@mantine/core';
import { useLetterStatus } from '@/hooks/useLetterStatus';
import { AlphabetKey } from '../AlphabetKey/AlphabetKey';

interface AlphabetStatusProps {
  onKeyPress: (key: string) => void;
  activeKey: string | null;
}

export const AlphabetStatus: FC<AlphabetStatusProps> = ({ onKeyPress, activeKey }) => {
  const topRow = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const middleRow = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const bottomRow = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

  const { letterStatusMap } = useLetterStatus();

  return (
    <Container my="xl" p={0} w="100%" style={{ maxWidth: 600 }}>
      <Stack gap={8}>
        {/* Top Row (Q-P) */}
        <Group gap="1.5%" wrap="nowrap">
          {topRow.map((key) => (
            <Box key={key} style={{ flex: 1 }}>
              <AlphabetKey
                activeKey={activeKey}
                onClick={() => onKeyPress(key)}
                letter={key}
                statuses={letterStatusMap[key] || ['empty', 'empty', 'empty']}
              />
            </Box>
          ))}
        </Group>

        {/* Middle Row (A-L) with Spacers */}
        <Group gap="1.5%" wrap="nowrap">
          {middleRow.map((key) => (
            <Box key={key} style={{ flex: 1 }}>
              <AlphabetKey
                activeKey={activeKey}
                onClick={() => onKeyPress(key)}
                letter={key}
                statuses={letterStatusMap[key] || ['empty', 'empty', 'empty']}
              />
            </Box>
          ))}
          <Box style={{ flex: 1.5 }}>
            <AlphabetKey activeKey={activeKey} onClick={() => onKeyPress('enter')} letter="⏎" />
          </Box>
        </Group>

        {/* Bottom Row (Z-M) with Spacers */}
        <Group gap="1.5%" wrap="nowrap">
          {bottomRow.map((key) => (
            <Box key={key} style={{ flex: 1 }}>
              <AlphabetKey
                activeKey={activeKey}
                onClick={() => onKeyPress(key)}
                letter={key}
                statuses={letterStatusMap[key] || ['empty', 'empty', 'empty']}
              />
            </Box>
          ))}
          <Box style={{ flex: 1 }}>
            <AlphabetKey activeKey={activeKey} onClick={() => onKeyPress('del')} letter="←" />
          </Box>
        </Group>
      </Stack>
    </Container>
  );
};
