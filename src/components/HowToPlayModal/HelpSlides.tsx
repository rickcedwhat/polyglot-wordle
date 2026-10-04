import { FC, ReactNode } from 'react';
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

export const HowToPlaySlides: FC = () => (
  <>
    <Slide
      title="Three words, three languages"
      text="Solve a 5-letter word in each of your three languages at once. Every guess is played on all three boards."
    >
      <DemoBoards guesses={[]} />
    </Slide>

    <Slide
      title="Color clues for letters"
      text={
        <>
          Like classic Wordle, each board colors your guess against its own word.{' '}
          <Text span fw={700} c="green">
            Green
          </Text>{' '}
          is the right letter in the right spot,{' '}
          <Text span fw={700} c="yellow">
            yellow
          </Text>{' '}
          is in the word but somewhere else, and{' '}
          <Text span fw={700}>
            gray
          </Text>{' '}
          isn't in the word.
        </>
      }
    >
      <DemoBoards guesses={DEMO_WIN.slice(0, 1)} />
    </Slide>

    <Slide
      title="Which board is which?"
      text="Boards are shuffled, and the flags show which languages each one could be. A green line under a guess means it's a real word in that board's language. PLATE is English and French, so the board without a line must be Spanish; CRANE is only English, which settles the other two."
    >
      <DemoBoards guesses={DEMO_WIN.slice(0, 2)} />
    </Slide>

    <Slide title="Winning" text={`Solve all three words within ${MAX_GUESSES} guesses.`}>
      <DemoBoards guesses={DEMO_WIN} />
    </Slide>
  </>
);

const rules = SCORING_RULES[SCORING_VERSION];
const yellowPerM = rules.yellow.mode === 'firstSeen' ? rules.yellow.perM : null;

const ScoringSlides: FC = () => (
  <>
    <Slide
      title="Points on every board"
      text={`Each new green tile is worth ${rules.greenPerM} × the turn multiplier${
        yellowPerM
          ? `, and a yellow that reveals a letter the board didn't know is worth ${yellowPerM} ×`
          : ''
      }. New greens on all three boards in one guess is a Hat trick (+${rules.hatTrick}).`}
    >
      <DemoScoring guesses={DEMO_WIN.slice(0, 1)} />
    </Slide>

    <Slide
      title="Earlier guesses are worth more"
      text={`The multiplier starts at ×${turnMultiplier(1)} on guess 1 and drops by one each guess.`}
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
      title="Solving words"
      text={`Solving a word is worth ${rules.wordSolvedPerM} × the multiplier, and the guess that solves your first word adds a First crack bonus (${rules.crackPerM} ×).`}
    >
      <DemoScoring guesses={DEMO_WIN.slice(0, 3)} />
    </Slide>

    <Slide
      title="Solving all three"
      text={`Finishing the game adds ${rules.gameSolvedPerM} × the multiplier of the guess you finish on.`}
    >
      <DemoScoring guesses={DEMO_WIN} />
    </Slide>

    <Slide
      title="Unsolved words cost you"
      text={`If you run out of guesses, each word you didn't solve takes ${Math.abs(rules.unsolvedPenalty)} points off.`}
    >
      <DemoScoring guesses={DEMO_LOSS} />
    </Slide>
  </>
);

const GameSetupSlides: FC = () => (
  <>
    <Slide
      title="Pick your three languages"
      text="New Game opens this picker. Tap three languages; each one gets its own board."
    >
      <DemoSetupPanel />
    </Slide>

    <Slide
      title="A difficulty for each board"
      text="Difficulty sets how rare that board's answer can be. Any real word in the language still counts as a guess."
    >
      <DemoDifficultyRows />
    </Slide>

    <Slide
      title="Use this setup every time"
      text="Turn it on and New Game starts right away with these languages and difficulties. Change them anytime from Game setup in the menu."
    >
      <DemoSetupPanel skipPicker />
    </Slide>
  </>
);

/** After CRANE, the English board (PLANT) has A and N green. */
const JUMBLE_GUESSES = DEMO_WIN.slice(1, 2);
const JUMBLE_TARGET = 1;
const NEAR_GREENS: LetterStatus[] = ['unknown', 'unknown', 'correct', 'correct', 'unknown'];

const JumbleSlides: FC = () => (
  <>
    <Slide
      title="Stuck? Try Letter Jumble"
      text="Tap 🔀 beside your guess row (or press Space). Each press of 🔀 shows a new arrangement of letters you already know about. It never reveals anything new."
    >
      <DemoJumbleRow isOpen={false} />
    </Slide>

    <Slide
      title="It follows one board"
      text="Letter Jumble outlines a target board: the board you're focused on, or the left one on wide screens. Tap another board to switch. Its greens stay in place, its yellows are always included in a new spot, and its gray letters are never used."
    >
      <DemoBoards guesses={JUMBLE_GUESSES} targetIndex={JUMBLE_TARGET} />
      <DemoJumbleRow
        isOpen
        letters="shank"
        locks={['suggested', 'suggested', 'kept', 'kept', 'suggested']}
        statuses={NEAR_GREENS}
      />
    </Slide>

    <Slide
      title="Your letters, your pins"
      text="Letters you type stay in the jumble but move around. Tap a letter twice to pin it in place, and again to unpin it. Faded letters are random suggestions; type over one to use your own."
    >
      <DemoJumbleRow
        isOpen
        letters="toans"
        locks={['kept', 'pinned', 'kept', 'kept', 'suggested']}
        statuses={NEAR_GREENS}
      />
    </Slide>

    <Slide
      title="One gap left"
      text="When only one slot is open, each press tries the next letter in keyboard order (Q, W, E, …), skipping letters already ruled out."
    >
      <DemoJumbleRow
        isOpen
        letters="blan"
        locks={['pinned', 'pinned', 'kept', 'kept', 'suggested']}
        statuses={NEAR_GREENS}
      />
    </Slide>

    <Slide
      title="Guess or leave"
      text="Like it? Press Enter to guess as usual and Letter Jumble closes. Not a word? It shakes like always. Press ✕ or Esc to leave without guessing."
    >
      <DemoJumbleRow
        isOpen
        letters="toans"
        locks={['kept', 'kept', 'kept', 'kept', 'kept']}
        statuses={NEAR_GREENS}
      />
    </Slide>
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
      title="Can I change the flags?"
      text="Yes. Open Custom Flags / Emojis in the menu and pick any emoji for each language. Your choice is used everywhere: boards, game setup, results and badges."
    />

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
  { value: 'jumble', label: 'Jumble', Slides: JumbleSlides },
  { value: 'faq', label: 'FAQ', Slides: FaqSlides },
] as const;
