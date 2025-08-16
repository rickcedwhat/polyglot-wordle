import { createContext, FC, ReactNode, useContext, useMemo, useState } from 'react';

interface ScoreContextType {
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

export const ScoreProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [score, setScore] = useState(0);

  const value = useMemo(() => ({ score, setScore }), [score]);

  return <ScoreContext.Provider value={value}>{children}</ScoreContext.Provider>;
};

export const useScore = () => {
  const context = useContext(ScoreContext);
  if (context === undefined) {
    throw new Error('useScore must be used within a ScoreProvider');
  }
  return context;
};
