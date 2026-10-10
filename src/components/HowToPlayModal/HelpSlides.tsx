import { FC, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Carousel } from '@mantine/carousel';
import { Badge, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { AlphabetKey } from '@/components/AlphabetKey/AlphabetKey';
import { MAX_GUESSES, SCORING_RULES, SCORING_VERSION } from '@/config';
import { turnMultiplier, type LetterStatus } from '@/utils/wordUtils';
import { DEMO_LOSS, DEMO_WIN } from './demoGame';
import {
  DemoBoards,
  DemoDifficultyRows,
  DemoJumbleRow,
  DemoScoring,
  DemoSetupPanel,
} from './HelpDemos';
import classes from './HowToPlayModal.module.css';

const Slide: FC<{ title: string; text: ReactNode; children?: ReactNode }> = ({
  title,
  text,
  children,
}) => (
  <Carousel.Slide>
    <Paper p="xl" className={classes.slide}>
      <Title order={3} mt="md" className={classes.title}>
        {title}
      </Title>
      <Text className={classes.text}>{text}</Text>
      {children}
    </Paper>
  </Carousel.Slide>
);

export const HowToPlaySlides: FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Slide title={t('help.play.threeTitle')} text={t('help.play.threeText')}>
        <DemoBoards guesses={[]} />
      </Slide>

      <Slide
        title={t('help.play.colorsTitle')}
        text={
          <Trans
            i18nKey="help.play.colorsText"
            components={{
              green: <Text span fw={700} c="green" />,
              yellow: <Text span fw={700} c="yellow" />,
              gray: <Text span fw={700} />,
            }}
          />
        }
      >
        <DemoBoards guesses={DEMO_WIN.slice(0, 1)} />
      </Slide>

      <Slide title={t('help.play.whichTitle')} text={t('help.play.whichText')}>
        <DemoBoards guesses={DEMO_WIN.slice(0, 2)} />
      </Slide>

      <Slide title={t('help.play.winTitle')} text={t('help.play.winText', { max: MAX_GUESSES })}>
        <DemoBoards guesses={DEMO_WIN} />
      </Slide>
    </>
  );
};

const rules = SCORING_RULES[SCORING_VERSION];
const yellowPerM = rules.yellow.mode === 'firstSeen' ? rules.yellow.perM : null;

const ScoringSlides: FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Slide
        title={t('help.scoring.pointsTitle')}
        text={
          yellowPerM
            ? t('help.scoring.pointsTextYellow', {
                green: rules.greenPerM,
                yellow: yellowPerM,
                hatTrick: rules.hatTrick,
              })
            : t('help.scoring.pointsText', { green: rules.greenPerM, hatTrick: rules.hatTrick })
        }
      >
        <DemoScoring guesses={DEMO_WIN.slice(0, 1)} />
      </Slide>

      <Slide
        title={t('help.scoring.earlyTitle')}
        text={t('help.scoring.earlyText', { start: turnMultiplier(1) })}
      >
        <Group gap={6} justify="center" mt="lg">
          {Array.from({ length: MAX_GUESSES }, (_, i) => (
            <Stack key={i} gap={2} align="center">
              <Text size="xs" c="dimmed">
                {i + 1}
              </Text>
              <Badge variant="light" size="lg">
                ×{turnMultiplier(i + 1)}
              </Badge>
            </Stack>
          ))}
        </Group>
      </Slide>

      <Slide
        title={t('help.scoring.solvingTitle')}
        text={t('help.scoring.solvingText', {
          solved: rules.wordSolvedPerM,
          crack: rules.crackPerM,
        })}
      >
        <DemoScoring guesses={DEMO_WIN.slice(0, 3)} />
      </Slide>

      <Slide
        title={t('help.scoring.allTitle')}
        text={t('help.scoring.allText', { bonus: rules.gameSolvedPerM })}
      >
        <DemoScoring guesses={DEMO_WIN} />
      </Slide>

      <Slide
        title={t('help.scoring.unsolvedTitle')}
        text={t('help.scoring.unsolvedText', { penalty: Math.abs(rules.unsolvedPenalty) })}
      >
        <DemoScoring guesses={DEMO_LOSS} />
      </Slide>
    </>
  );
};

const GameSetupSlides: FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Slide title={t('help.setup.pickTitle')} text={t('help.setup.pickText')}>
        <DemoSetupPanel />
      </Slide>

      <Slide title={t('help.setup.difficultyTitle')} text={t('help.setup.difficultyText')}>
        <DemoDifficultyRows />
      </Slide>

      <Slide title={t('help.setup.everyTimeTitle')} text={t('help.setup.everyTimeText')}>
        <DemoSetupPanel skipPicker />
      </Slide>
    </>
  );
};

/** After CRANE, the English board (PLANT) has A and N green. */
const JUMBLE_GUESSES = DEMO_WIN.slice(1, 2);
const JUMBLE_TARGET = 1;
const NEAR_GREENS: LetterStatus[] = ['unknown', 'unknown', 'correct', 'correct', 'unknown'];

const JumbleSlides: FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Slide title={t('help.jumble.stuckTitle')} text={t('help.jumble.stuckText')}>
        <DemoJumbleRow isOpen={false} />
      </Slide>

      <Slide title={t('help.jumble.followsTitle')} text={t('help.jumble.followsText')}>
        <DemoBoards guesses={JUMBLE_GUESSES} targetIndex={JUMBLE_TARGET} />
        <DemoJumbleRow
          isOpen
          letters="shank"
          locks={['suggested', 'suggested', 'kept', 'kept', 'suggested']}
          statuses={NEAR_GREENS}
        />
      </Slide>

      <Slide title={t('help.jumble.pinsTitle')} text={t('help.jumble.pinsText')}>
        <DemoJumbleRow
          isOpen
          letters="toans"
          locks={['kept', 'pinned', 'kept', 'kept', 'suggested']}
          statuses={NEAR_GREENS}
        />
      </Slide>

      <Slide title={t('help.jumble.gapTitle')} text={t('help.jumble.gapText')}>
        <DemoJumbleRow
          isOpen
          letters="blan"
          locks={['pinned', 'pinned', 'kept', 'kept', 'suggested']}
          statuses={NEAR_GREENS}
        />
      </Slide>

      <Slide title={t('help.jumble.leaveTitle')} text={t('help.jumble.leaveText')}>
        <DemoJumbleRow
          isOpen
          letters="toans"
          locks={['kept', 'kept', 'kept', 'kept', 'kept']}
          statuses={NEAR_GREENS}
        />
      </Slide>
    </>
  );
};

const KEY_EXAMPLES: { letter: string; statuses: LetterStatus[] }[] = [
  { letter: 'e', statuses: ['correct', 'present', 'absent'] },
  { letter: 'r', statuses: ['absent', 'absent', 'correct'] },
  { letter: 's', statuses: ['present', 'unknown', 'unknown'] },
];

const FaqSlides: FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Slide title={t('help.faq.dotsTitle')} text={t('help.faq.dotsText')}>
        <Group gap="sm" justify="center" mt="lg">
          {KEY_EXAMPLES.map(({ letter, statuses }) => (
            <div key={letter} className={classes.keyExample}>
              <AlphabetKey
                letter={letter}
                statuses={statuses}
                activeKey={null}
                onClick={() => {}}
              />
            </div>
          ))}
        </Group>
      </Slide>

      <Slide title={t('help.faq.flagsTitle')} text={t('help.faq.flagsText')} />

      <Slide title={t('help.faq.accentsTitle')} text={t('help.faq.accentsText')} />

      <Slide title={t('help.faq.rejectedTitle')} text={t('help.faq.rejectedText')} />

      <Slide title={t('help.faq.challengesTitle')} text={t('help.faq.challengesText')} />

      <Slide title={t('help.faq.difficultyTitle')} text={t('help.faq.difficultyText')} />

      <Slide title={t('help.faq.languageTitle')} text={t('help.faq.languageText')} />
    </>
  );
};

export const HELP_TOPICS = [
  { value: 'play', Slides: HowToPlaySlides },
  { value: 'scoring', Slides: ScoringSlides },
  { value: 'setup', Slides: GameSetupSlides },
  { value: 'jumble', Slides: JumbleSlides },
  { value: 'faq', Slides: FaqSlides },
] as const;
