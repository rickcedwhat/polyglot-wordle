import { FC, useState } from 'react';
import cx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useWordPools } from '@/hooks/useWordPools';
import { Language } from '@/types/firestore';
import { deduceColumnLanguages } from '@/utils/deductionUtils';
import type { Dictionary } from '@/utils/wordUtils';
import LanguageBoard from '../LanguageBoard/LanguageBoard';
import type { ScoreBurst } from '../ScoreFlights/flightUtils';
import classes from './Gameboard.module.css';

export type GameBoardWordPools = {
  master: Partial<Record<Language, string[]>>;
  dictionaries: Partial<Record<Language, Dictionary>>;
};

interface GameBoardProps {
  solution: { [key: string]: string };
  guesses: string[];
  shuffledLanguages: Language[];
  hideFlags?: boolean;
  /** Initial focused board index. Used by Storybook and tests. */
  initialActiveIndex?: number;
  /** Called when the player focuses a board. */
  onActiveIndexChange?: (index: number) => void;
  /** Board outlined as the Letter Jumble target. */
  targetIndex?: number | null;
  /** Skip waiting on network — provide pools directly (Storybook / tests). */
  wordPoolsOverride?: GameBoardWordPools;
  /** Score events from the latest guess, animated on the boards. */
  scoreBurst?: ScoreBurst | null;
}

export const GameBoard: FC<GameBoardProps> = ({
  solution,
  guesses,
  shuffledLanguages,
  hideFlags = false,
  initialActiveIndex = 1,
  onActiveIndexChange,
  targetIndex = null,
  wordPoolsOverride,
  scoreBurst,
}) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndexState] = useState(initialActiveIndex);
  const setActiveIndex = (index: number) => {
    setActiveIndexState(index);
    onActiveIndexChange?.(index);
  };
  /** On narrow screens only the active board is full size; the others shrink to mini boards. */
  const isNarrow = useMediaQuery('(max-width: 48em)') ?? false;
  const prefersReducedMotion = useReducedMotion();
  const boardDifficulties = Object.fromEntries(
    shuffledLanguages.map((lang) => [lang, 'advanced' as const])
  );
  const { data: fetchedPools } = useWordPools(wordPoolsOverride ? undefined : boardDifficulties);
  const wordPools = wordPoolsOverride ?? fetchedPools;

  if (!wordPools) {
    return <div>{t('game.loadingBoards')}</div>;
  }

  const deduction = deduceColumnLanguages(guesses, shuffledLanguages, wordPools.dictionaries);

  return (
    <Group
      className={cx(classes.boardContainer, { [classes.narrow]: isNarrow })}
      wrap="nowrap"
      gap="md"
      justify="space-evenly"
      align="center"
    >
      {shuffledLanguages.map((lang, index) => {
        const isActive = index === activeIndex;
        const candidateLanguages = deduction.candidates[index] || [...shuffledLanguages];
        return (
          <motion.div
            key={lang}
            layout={isNarrow && !prefersReducedMotion}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cx(classes.boardWrapper, {
              [classes.active]: isActive,
              [classes.target]: index === targetIndex,
            })}
            onClick={() => setActiveIndex(index)}
            onLayoutAnimationComplete={() => window.dispatchEvent(new Event('resize'))}
          >
            <LanguageBoard
              language={lang}
              solutionWord={solution[lang]}
              submittedGuesses={guesses}
              words={wordPools.master[lang as Language] ?? []}
              dictionary={wordPools.dictionaries[lang as Language]}
              candidateLanguages={candidateLanguages}
              hideFlags={hideFlags}
              isActive={isActive}
              flagsOnTop={isNarrow}
              onActivate={() => setActiveIndex(index)}
              scoreBurst={
                scoreBurst && {
                  ...scoreBurst,
                  events: scoreBurst.events.filter((e) => e.lang === lang),
                }
              }
            />
          </motion.div>
        );
      })}
    </Group>
  );
};
