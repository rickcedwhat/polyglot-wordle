import { FC, useState } from 'react';
import cx from 'clsx';
import { motion } from 'framer-motion';
import { Group } from '@mantine/core';
import { useWordPools } from '@/hooks/useWordPools';
import { Language } from '@/types/firestore';
import { deduceColumnLanguages } from '@/utils/deductionUtils';
import { Dictionary } from '@/utils/wordUtils';
import LanguageBoard from '../LanguageBoard/LanguageBoard';
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
  /** Initial focused board index (0–2). Used by Storybook and tests. */
  initialActiveIndex?: number;
  /** Skip waiting on network — provide pools directly (Storybook / tests). */
  wordPoolsOverride?: GameBoardWordPools;
}

export const GameBoard: FC<GameBoardProps> = ({
  solution,
  guesses,
  shuffledLanguages,
  hideFlags = false,
  initialActiveIndex = 1,
  wordPoolsOverride,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const boardDifficulties = Object.fromEntries(
    shuffledLanguages.map((lang) => [lang, 'advanced' as const])
  );
  const { data: fetchedPools } = useWordPools(wordPoolsOverride ? undefined : boardDifficulties);
  const wordPools = wordPoolsOverride ?? fetchedPools;

  if (!wordPools) {
    return <div>Loading boards...</div>;
  }

  const deduction = deduceColumnLanguages(guesses, shuffledLanguages, wordPools.dictionaries);

  return (
    <Group
      className={classes.boardContainer}
      wrap="nowrap"
      gap="md"
      justify="space-evenly"
      align="center"
    >
      {shuffledLanguages.map((lang, index) => {
        const isActive = index === activeIndex;
        const candidateLanguages = deduction.candidates[index] || [...shuffledLanguages];
        const isConfirmed = deduction.isConfirmed[index];

        return (
          <motion.div
            key={lang}
            className={cx(classes.boardWrapper, { [classes.active]: isActive })}
            onClick={() => setActiveIndex(index)}
          >
            <LanguageBoard
              language={lang}
              solutionWord={solution[lang]}
              submittedGuesses={guesses}
              words={wordPools.master[lang as Language] ?? []}
              dictionary={wordPools.dictionaries[lang as Language]}
              candidateLanguages={candidateLanguages}
              isConfirmed={isConfirmed}
              hideFlags={hideFlags}
              isActive={isActive}
              onActivate={() => setActiveIndex(index)}
            />
          </motion.div>
        );
      })}
    </Group>
  );
};
