import { FC, ReactNode } from 'react';
import { IconChartBar, IconTrophy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Divider, Group, Paper, Stack, Text } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import { useScore } from '@/context/ScoreContext';
import { useCountUp } from '@/hooks/useCountUp';
import { SCORE_TARGET_ATTR } from '../ScoreFlights/flightUtils';

interface ScoreProps {
  orientation?: 'vertical' | 'horizontal';
  /** Shows a Summary button that opens the match summary. */
  onOpenSummary?: () => void;
}

const DIGITS = { fontVariantNumeric: 'tabular-nums' } as const;

export const Score: FC<ScoreProps> = ({ orientation = 'vertical', onOpenSummary }) => {
  const { score: targetScore, heldPoints, numberOfGuesses } = useScore();
  const { t } = useTranslation();
  const score = useCountUp(targetScore - heldPoints);
  const targetProps = { [SCORE_TARGET_ATTR]: true };

  // HORIZONTAL LAYOUT (for the header)
  if (orientation === 'horizontal') {
    return (
      <Group gap="xs" wrap="nowrap">
        <IconTrophy size="1.2rem" />
        <Text fz="sm" fw={700} style={DIGITS} {...targetProps}>
          {score}
        </Text>
        <Divider orientation="vertical" />
        <Text fz="sm" fw={500} style={DIGITS}>
          {numberOfGuesses}/{MAX_GUESSES}
        </Text>
      </Group>
    );
  }

  // VERTICAL LAYOUT (the default, for the sidebar)
  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap="xs" wrap="nowrap">
            <IconTrophy size="1.1rem" />
            <Text fz="sm" fw={500}>
              {t('score.score')}
            </Text>
          </Group>
          <Text fw={700} style={DIGITS} {...targetProps}>
            {score}
          </Text>
        </Group>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text fz="sm" fw={500}>
            {t('score.guesses')}
          </Text>
          <Text fw={700} style={DIGITS}>
            {numberOfGuesses} / {MAX_GUESSES}
          </Text>
        </Group>
        {onOpenSummary && (
          <Button
            size="compact-sm"
            variant="light"
            fullWidth
            leftSection={<IconChartBar size={14} />}
            onClick={onOpenSummary}
          >
            {t('score.summary')}
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

/** Equal-width sides keep the score centred whatever sits next to it. */
const SIDE = { flex: '1 1 0', minWidth: 0 } as const;

/** The phone header: menu on the left, the score centred, the summary button on the right. */
export const ScoreHeader: FC<{
  menu: ReactNode;
  showScore: boolean;
  onOpenSummary?: (() => void) | null;
}> = ({ menu, showScore, onOpenSummary }) => {
  const { t } = useTranslation();
  return (
    <Group justify="space-between" wrap="nowrap" w="100%" gap="xs">
      <Group style={SIDE} wrap="nowrap">
        {menu}
      </Group>
      {showScore && <Score orientation="horizontal" />}
      <Group style={SIDE} justify="flex-end" wrap="nowrap">
        {showScore && onOpenSummary && (
          <Button size="compact-xs" variant="light" onClick={onOpenSummary}>
            {t('score.summary')}
          </Button>
        )}
      </Group>
    </Group>
  );
};
