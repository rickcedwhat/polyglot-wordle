import { FC, useState } from 'react';
import cx from 'clsx';
import { motion } from 'framer-motion'; // 1. Import motion
import { Group } from '@mantine/core';
import { useWordPools } from '@/hooks/useWordPools';
import { Language } from '@/types/firestore';
import LanguageBoard from '../LanguageBoard/LanguageBoard';
import classes from './Gameboard.module.css';

interface GameBoardProps {
  solution: { [key: string]: string };
  guesses: string[];
  shuffledLanguages: Language[];
}

export const GameBoard: FC<GameBoardProps> = ({ solution, guesses, shuffledLanguages }) => {
  const [activeIndex, setActiveIndex] = useState(1);
  const { data: wordPools, isLoading: arePoolsLoading } = useWordPools({
    en: 'advanced',
    es: 'advanced',
    fr: 'advanced',
  });

  if (arePoolsLoading || !wordPools) {
    return <div>Loading boards...</div>;
  }

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

        return (
          // 2. Use motion.div instead of Box
          <motion.div
            key={lang}
            // 3. Add the magic `layout` prop
            layout
            // 4. Define the animation transition
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cx(classes.boardWrapper, { [classes.active]: isActive })}
            onClick={() => setActiveIndex(index)}
          >
            <LanguageBoard
              language={lang}
              solutionWord={solution[lang]}
              submittedGuesses={guesses}
              words={wordPools.master[lang as Language]}
            />
          </motion.div>
        );
      })}
    </Group>
  );
};
