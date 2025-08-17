import { createContext, FC, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { GameDoc } from '@/types/firestore.d.ts';
import { calculateScoreFromHistory } from '@/utils/wordUtils';

interface ScoreContextType {
  score: number;
  numberOfGuesses: number;
  recalculateScore: (guesses: string[], solution: GameDoc['words']) => number;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

export const ScoreProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [score, setScore] = useState(0);
  const [numberOfGuesses, setNumberOfGuesses] = useState(0);

  // 3. Define the recalculation logic here
  const recalculateScore = useCallback((guesses: string[], solution: GameDoc['words']) => {
    const newTotalScore = calculateScoreFromHistory(guesses, solution);
    setScore(newTotalScore);
    setNumberOfGuesses(guesses.length);
    return newTotalScore; // Return the new score
  }, []);

  const value = useMemo(
    () => ({ score, recalculateScore, numberOfGuesses }),
    [score, recalculateScore]
  );

  return <ScoreContext.Provider value={value}>{children}</ScoreContext.Provider>;
};

export const useScore = () => {
  const context = useContext(ScoreContext);
  if (context === undefined) {
    throw new Error('useScore must be used within a ScoreProvider');
  }
  return context;
};
