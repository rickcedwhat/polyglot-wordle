import { createContext, FC, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { GameDoc } from '@/types/firestore.d.ts';
import { calculateScoreFromHistory } from '@/utils/wordUtils';

interface ScoreContextType {
  score: number;
  numberOfGuesses: number;
  recalculateScore: (guesses: string[], solution: GameDoc['words']) => number;
  /** Points already in `score` that the counter shouldn't show until their flights land. */
  heldPoints: number;
  flightsInProgress: boolean;
  /** Replace any held points with this burst's per-flight points. */
  holdPoints: (burstId: number, flights: Record<string, number>) => void;
  /** Release one flight's points; repeat calls are no-ops. */
  releasePoints: (burstId: number, flightKey: string) => void;
}

interface HeldFlights {
  burstId: number;
  flights: Record<string, number>;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

export const ScoreProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [score, setScore] = useState(0);
  const [numberOfGuesses, setNumberOfGuesses] = useState(0);
  const [held, setHeld] = useState<HeldFlights>({ burstId: 0, flights: {} });

  // 3. Define the recalculation logic here
  const recalculateScore = useCallback((guesses: string[], solution: GameDoc['words']) => {
    const newTotalScore = calculateScoreFromHistory(guesses, solution);
    setScore(newTotalScore);
    setNumberOfGuesses(guesses.length);
    return newTotalScore; // Return the new score
  }, []);

  const holdPoints = useCallback((burstId: number, flights: Record<string, number>) => {
    setHeld({ burstId, flights });
  }, []);

  const releasePoints = useCallback((burstId: number, flightKey: string) => {
    setHeld((current) => {
      if (current.burstId !== burstId || !(flightKey in current.flights)) {
        return current;
      }
      const { [flightKey]: _released, ...rest } = current.flights;
      return { burstId, flights: rest };
    });
  }, []);

  const heldPoints = useMemo(
    () => Object.values(held.flights).reduce((total, points) => total + points, 0),
    [held]
  );

  const value = useMemo(
    () => ({
      score,
      recalculateScore,
      numberOfGuesses,
      heldPoints,
      flightsInProgress: Object.keys(held.flights).length > 0,
      holdPoints,
      releasePoints,
    }),
    [score, recalculateScore, numberOfGuesses, heldPoints, held, holdPoints, releasePoints]
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

const noop = () => {};

/** Hold/release controls for score flights; no-ops outside a ScoreProvider. */
export const useScoreFlightControls = () => {
  const context = useContext(ScoreContext);
  return {
    holdPoints: context?.holdPoints ?? noop,
    releasePoints: context?.releasePoints ?? noop,
  };
};
