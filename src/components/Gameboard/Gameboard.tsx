import { FC, useState } from 'react';
import cx from 'clsx';
import { motion } from 'framer-motion';
import { Group } from '@mantine/core';
import { useWordPools } from '@/hooks/useWordPools';
import { Language } from '@/types/firestore';
import { deduceColumnLanguages } from '@/utils/deductionUtils';
import LanguageBoard from '../LanguageBoard/LanguageBoard';
import classes from './Gameboard.module.css';

interface GameBoardProps {
  solution: { [key: string]: string };
  guesses: string[];
  shuffledLanguages: Language[];
  hideFlags?: boolean;
}

export const GameBoard: FC<GameBoardProps> = ({
  solution,
  guesses,
  shuffledLanguages,
  hideFlags = false,
}) => {
  const [activeIndex, setActiveIndex] = useState(1);
  const { data: wordPools } = useWordPools({
    en: 'advanced',
    es: 'advanced',
    fr: 'advanced',
  });

  if (!wordPools) {
    return <div>Loading boards...</div>;
  }

  const deduction = deduceColumnLanguages(guesses, shuffledLanguages, wordPools.dictionaries);

  return (
    <Group
      className={classes.boardContainer}
      wrap="nowrap"
      gap="md"
      justify="center"
      align="center"
    >
      {shuffledLanguages.map((lang, index) => {
        const isActive = index === activeIndex;
        const candidateLanguages = deduction.candidates[index] || ['en', 'es', 'fr'];
        const isConfirmed = deduction.isConfirmed[index];

        return (
          <motion.div
            key={lang}
            layout
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cx(classes.boardWrapper, { [classes.active]: isActive })}
            onClick={() => setActiveIndex(index)}
          >
            <LanguageBoard
              language={lang}
              solutionWord={solution[lang]}
              submittedGuesses={guesses}
              words={wordPools.master[lang as Language]}
              dictionary={wordPools.dictionaries[lang as Language]}
              candidateLanguages={candidateLanguages}
              isConfirmed={isConfirmed}
              hideFlags={hideFlags}
            />
          </motion.div>
        );
      })}
    </Group>
  );
};
