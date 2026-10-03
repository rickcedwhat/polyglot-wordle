import { FC, ReactNode } from 'react';
import { Carousel } from '@mantine/carousel';
import { Badge, Center, Group, Image, Paper, Stack, Text, Title } from '@mantine/core';
import { AlphabetKey } from '@/components/AlphabetKey/AlphabetKey';
import tones from '@/components/ScorePopups/ScoreTones.module.css';
import { MAX_GUESSES, SCORING_RULES, SCORING_VERSION } from '@/config';
import { turnMultiplier, type LetterStatus } from '@/utils/wordUtils';
import classes from './HowToPlayModal.module.css';

const Slide: FC<{
  title: string;
  text: ReactNode;
  image?: string;
  alt?: string;
  children?: ReactNode;
}> = ({ title, text, image, alt, children }) => (
  <Carousel.Slide>
    <Paper p="xl" className={classes.slide}>
      <Title order={3} mt="md" className={classes.title}>
        {title}
      </Title>
      <Text className={classes.text}>{text}</Text>
      {image && (
        <Center mt="lg">
          <Image src={image} alt={alt} className={classes.image} />
        </Center>
      )}
      {children}
    </Paper>
  </Carousel.Slide>
);

export const HowToPlaySlides: FC = () => {
  return (
    <>
      <Slide
        title="Multiple Games at Once"
        text="Solve three 5-letter words simultaneously, one in each language you pick."
        image="/screenshots/how-to-play-1.png"
        alt="Three game boards"
      />

      <Slide
        title="Color Clues for Letters"
        text="Just like classic wordle, the color of the tiles will change to show how close your guess was."
        image="/screenshots/how-to-play-2.png"
        alt="Color clues for letters"
      >
        <Text mt="sm">
          <Text span fw={700} c="green">
            Green:
          </Text>{' '}
          Correct letter, correct spot.
        </Text>
        <Text>
          <Text span fw={700} c="yellow">
            Yellow:
          </Text>{' '}
          Correct letter, wrong spot.
        </Text>
        <Text>
          <Text span fw={700}>
            Gray:
          </Text>{' '}
          Letter is not in the word.
        </Text>
      </Slide>

      <Slide
        title="Each board corresponds to a language"
        text="A green line will appear beneath a word if it matches the current board's language"
        image="/screenshots/how-to-play-3.png"
        alt="Underlined word in English board"
      />

      <Slide
        title="Winning"
        text={`You have ${MAX_GUESSES} guesses to solve every word.`}
        image="/screenshots/how-to-play-4.png"
        alt="Winning screen with solved words"
      />
    </>
  );
};

const rules = SCORING_RULES[SCORING_VERSION];
const FIRST_M = turnMultiplier(1);
const LAST_M = turnMultiplier(MAX_GUESSES);
const yellowPoints =
  rules.yellow.mode === 'firstSeen' ? rules.yellow.perM * FIRST_M : rules.yellow.base;

const Points: FC<{
  tone: 'green' | 'yellow' | 'solved' | 'penalty';
  points: number;
  label: string;
}> = ({ tone, points, label }) => (
  <Group gap="sm" wrap="nowrap" justify="space-between" w="100%" maw={320}>
    <Text size="sm" ta="left">
      {label}
    </Text>
    <span className={`${classes.pill} ${tones[tone]}`}>
      {points > 0 ? `+${points}` : `−${Math.abs(points)}`}
    </span>
  </Group>
);

const ScoringSlides: FC = () => (
  <>
    <Slide
      title="Earlier guesses are worth more"
      text={`Points are multiplied by how early you are: ×${FIRST_M} on guess 1, down to ×${LAST_M} on guess ${MAX_GUESSES}.`}
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
      title="Points on every board"
      text={`Each guess scores on all three boards. Values shown for guess 1 (×${FIRST_M}).`}
    >
      <Stack gap="xs" mt="lg" align="center" w="100%">
        <Points tone="green" points={rules.greenPerM * FIRST_M} label="New green tile" />
        <Points
          tone="yellow"
          points={yellowPoints}
          label="Yellow that reveals a letter the board didn't know"
        />
        <Points tone="solved" points={rules.wordSolvedPerM * FIRST_M} label="Solving a word" />
      </Stack>
    </Slide>

    <Slide title="Bonuses" text={`Values shown for guess 1 (×${FIRST_M}).`}>
      <Stack gap="xs" mt="lg" align="center" w="100%">
        {rules.crackPerM > 0 && (
          <Points
            tone="solved"
            points={rules.crackPerM * FIRST_M}
            label="First crack: the guess that solves your first word"
          />
        )}
        {rules.hatTrick > 0 && (
          <Points
            tone="green"
            points={rules.hatTrick}
            label="Hat trick: new greens on all three boards in one guess (any turn)"
          />
        )}
        <Points
          tone="solved"
          points={rules.gameSolvedPerM * FIRST_M}
          label="Solving all three, multiplied by the guess you finish on"
        />
      </Stack>
    </Slide>

    <Slide
      title="Unsolved words cost you"
      text={`If you run out of guesses, each word you didn't solve takes points off your score.`}
    >
      <Stack gap="xs" mt="lg" align="center" w="100%">
        <Points tone="penalty" points={rules.unsolvedPenalty} label="Each unsolved word" />
      </Stack>
    </Slide>
  </>
);

const DIFFICULTY_BADGES = [
  { label: 'Basic', color: 'teal', text: 'Everyday words' },
  { label: 'Intermediate', color: 'yellow', text: 'Less common words' },
  { label: 'Advanced', color: 'red', text: 'Any word in the dictionary' },
];

const GameSetupSlides: FC = () => (
  <>
    <Slide
      title="Pick your three languages"
      text="Choose any three of English, Spanish, French, Italian and Portuguese. Each one gets its own board."
    />

    <Slide
      title="A difficulty for each board"
      text="Difficulty sets how rare that board's answer can be. Any real word in the language still counts as a guess."
    >
      <Stack gap="xs" mt="lg" mx="auto" align="flex-start" w="fit-content">
        {DIFFICULTY_BADGES.map(({ label, color, text }) => (
          <Group key={label} gap="sm" wrap="nowrap">
            <Badge color={color} w={110}>
              {label}
            </Badge>
            <Text size="sm">{text}</Text>
          </Group>
        ))}
      </Stack>
    </Slide>

    <Slide
      title="Use this setup every time"
      text="Turn it on and New Game starts right away with your languages and difficulties. Change them anytime from Game setup in the menu."
    />
  </>
);

const KEY_EXAMPLES: { letter: string; statuses: LetterStatus[] }[] = [
  { letter: 'e', statuses: ['correct', 'present', 'absent'] },
  { letter: 'r', statuses: ['absent', 'absent', 'correct'] },
  { letter: 's', statuses: ['present', 'unknown', 'unknown'] },
];

const FaqSlides: FC = () => (
  <>
    <Slide
      title="What are the dots on the keyboard?"
      text="Each key has three dots, one per board from left to right. Green and yellow work like the tiles, red means the letter isn't in that board's word, and a dim dot means you haven't tried it there yet."
    >
      <Group gap="sm" justify="center" mt="lg">
        {KEY_EXAMPLES.map(({ letter, statuses }) => (
          <div key={letter} className={classes.keyExample}>
            <AlphabetKey letter={letter} statuses={statuses} activeKey={null} onClick={() => {}} />
          </div>
        ))}
      </Group>
    </Slide>

    <Slide
      title="Do I need to type accents?"
      text="No. Accents are ignored when checking guesses, so UNITE matches UNITÉ and ARBOL matches ÁRBOL."
    />

    <Slide
      title="My word wasn't accepted"
      text="Press Enter three times on it and you can flag it as missing from a dictionary. If you re-enter a word you already played, you can flag it for the languages that don't have it."
    />

    <Slide
      title="How do challenges work?"
      text="Challenge friends on a game you just finished, or start a new one together. Everyone plays the exact same boards, and you see each result as they finish."
    />

    <Slide
      title="Does difficulty change my score?"
      text="No. Scoring is the same at every difficulty; harder boards just have rarer answers."
    />
  </>
);

export const HELP_TOPICS = [
  { value: 'play', label: 'How to play', Slides: HowToPlaySlides },
  { value: 'scoring', label: 'Scoring', Slides: ScoringSlides },
  { value: 'setup', label: 'Game setup', Slides: GameSetupSlides },
  { value: 'faq', label: 'FAQ', Slides: FaqSlides },
] as const;
