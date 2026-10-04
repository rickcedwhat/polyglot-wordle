import { FC, useEffect, useState } from 'react';
import { Badge, Stack, Text } from '@mantine/core';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import { GameSetupPanel, LanguageRow } from '@/components/GameSetup/GameSetupPanel';
import { GuessInput } from '@/components/LetterJumble/GuessInput';
import { ScorePopups } from '@/components/ScorePopups/ScorePopups';
import { useLanguageFlags } from '@/hooks/useLanguageFlags';
import type { LetterJumble } from '@/hooks/useLetterJumble';
import type { Difficulty, Language } from '@/types/firestore';
import type { JumbleLock, JumbleSlot } from '@/utils/letterJumble';
import {
  calculateScoreFromHistory,
  getLatestTurnScoreEvents,
  type LetterStatus,
} from '@/utils/wordUtils';
import { DEMO_BOARDS, DEMO_POOLS, DEMO_SOLUTION } from './demoGame';
import classes from './HowToPlayModal.module.css';

const noop = () => {};

/** The real game boards for a scripted game; not interactive. */
export const DemoBoards: FC<{ guesses: string[]; targetIndex?: number }> = ({
  guesses,
  targetIndex,
}) => (
  <div inert className={classes.demo}>
    <GameBoard
      solution={DEMO_SOLUTION}
      shuffledLanguages={DEMO_BOARDS}
      guesses={guesses}
      wordPoolsOverride={DEMO_POOLS}
      targetIndex={targetIndex}
    />
  </div>
);

/** The real guess row with Letter Jumble's controls, frozen in one state. */
export const DemoJumbleRow: FC<{
  isOpen: boolean;
  letters?: string;
  locks?: JumbleLock[];
  statuses?: LetterStatus[];
}> = ({ isOpen, letters = '', locks = [], statuses }) => {
  const slots: JumbleSlot[] = Array.from({ length: 5 }, (_, i) => ({
    letter: letters[i]?.trim() ?? '',
    lock: locks[i] ?? 'kept',
  }));
  const jumble: LetterJumble = {
    enabled: true,
    isOpen,
    targetBoard: null,
    slots,
    statuses,
    conflicts: undefined,
    press: noop,
    close: noop,
    togglePinAt: noop,
  };
  return (
    <div inert className={`${classes.demo} ${classes.demoPanel}`}>
      <GuessInput
        guess={slots.map((s) => s.letter)}
        cursorIndex={-1}
        isInvalid={false}
        onTileClick={noop}
        jumble={jumble}
      />
    </div>
  );
};

const REPLAY_MS = 4000;

/** Replays the score animation of the last guess in `guesses` every few seconds. */
export const DemoScoring: FC<{ guesses: string[] }> = ({ guesses }) => {
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setReplay((n) => n + 1), REPLAY_MS);
    return () => window.clearInterval(timer);
  }, []);
  const events = getLatestTurnScoreEvents(guesses, DEMO_SOLUTION);
  const score = calculateScoreFromHistory(guesses, DEMO_SOLUTION);

  return (
    <div inert className={classes.demo}>
      <div className={classes.demoScore}>
        <ScorePopups key={replay} events={events} />
        <Badge variant="outline" size="lg">
          Score {score}
        </Badge>
      </div>
      <GameBoard
        key={replay}
        solution={DEMO_SOLUTION}
        shuffledLanguages={DEMO_BOARDS}
        guesses={guesses}
        wordPoolsOverride={DEMO_POOLS}
        scoreBurst={{ id: replay, events }}
      />
    </div>
  );
};

/** The real setup panel with a sample selection; not interactive. */
export const DemoSetupPanel: FC<{ skipPicker?: boolean }> = ({ skipPicker = false }) => (
  <div inert className={`${classes.demo} ${classes.demoPanel}`}>
    <GameSetupPanel
      mode="newGame"
      initialLanguages={['en', 'es', 'pt']}
      initialDifficulties={{ en: 'advanced', es: 'intermediate', pt: 'basic' }}
      initialSkipPicker={skipPicker}
      onSubmit={noop}
    />
  </div>
);

const DIFFICULTY_EXAMPLES: { lang: Language; difficulty: Difficulty; meaning: string }[] = [
  { lang: 'pt', difficulty: 'basic', meaning: 'Everyday words' },
  { lang: 'es', difficulty: 'intermediate', meaning: 'Less common words' },
  { lang: 'en', difficulty: 'advanced', meaning: 'Any word in the dictionary' },
];

/** Setup rows at each difficulty, with what that difficulty means. */
export const DemoDifficultyRows: FC = () => {
  const { flags } = useLanguageFlags();
  return (
    <Stack inert gap="sm" className={`${classes.demo} ${classes.demoPanel}`}>
      {DIFFICULTY_EXAMPLES.map(({ lang, difficulty, meaning }) => (
        <div key={lang}>
          <LanguageRow
            lang={lang}
            flag={flags[lang]}
            selected
            disabled={false}
            difficulty={difficulty}
            onToggle={noop}
            onDifficulty={noop}
          />
          <Text size="xs" c="dimmed" ta="left" mt={4}>
            {meaning}
          </Text>
        </div>
      ))}
    </Stack>
  );
};
