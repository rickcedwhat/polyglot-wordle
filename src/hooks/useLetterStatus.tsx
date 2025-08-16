import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GameDoc } from '@/types/firestore.d.ts';
import { getGuessStatuses, LetterStatus, normalizeWord } from '@/utils/wordUtils';

type LetterStatusMap = Record<string, LetterStatus[]>;
type Solution = GameDoc['words'];

const STATUS_MAP_QUERY_KEY = ['letterStatusMap'];

const calculateLetterStatusMap = (guesses: string[], solution: Solution): LetterStatusMap => {
  const statuses: LetterStatusMap = {};
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  for (const letter of alphabet) {
    statuses[letter] = ['unknown', 'unknown', 'unknown'];
  }
  if (!solution || !solution.en) {
    return statuses;
  }

  const languageOrder: (keyof Solution)[] = ['en', 'es', 'fr'];
  languageOrder.forEach((langKey, langIndex) => {
    const solutionWord = solution[langKey];
    guesses.forEach((guess) => {
      const guessResult = getGuessStatuses(guess, solutionWord);
      normalizeWord(guess)
        .split('')
        .forEach((letter, letterIndex) => {
          if (statuses[letter]) {
            const currentStatus = statuses[letter][langIndex];
            const newStatus = guessResult[letterIndex];
            if (newStatus === 'correct') {
              statuses[letter][langIndex] = 'correct';
            } else if (newStatus === 'present' && currentStatus !== 'correct') {
              statuses[letter][langIndex] = 'present';
            } else if (newStatus === 'absent' && currentStatus === 'unknown') {
              statuses[letter][langIndex] = 'absent';
            }
          }
        });
    });
  });
  return statuses;
};

// This is the initial state for the cache
const initialMap = calculateLetterStatusMap([], { en: '', es: '', fr: '' });

export const useLetterStatus = () => {
  const queryClient = useQueryClient();

  // This query's job is simply to hold the state in the cache
  const { data: letterStatusMap } = useQuery({
    queryKey: STATUS_MAP_QUERY_KEY,
    queryFn: () => initialMap, // This function only runs once if the cache is empty
    initialData: initialMap, // Set the starting value
    staleTime: Infinity, // This data is client-side, it never goes stale on its own
  });

  // This mutation's job is to update the state in the cache
  const { mutate: updateLetterStatuses } = useMutation({
    mutationFn: async ({ guesses, solution }: { guesses: string[]; solution: Solution }) => {
      const newMap = calculateLetterStatusMap(guesses, solution);
      // Manually update the data in the TanStack Query cache
      return queryClient.setQueryData(STATUS_MAP_QUERY_KEY, newMap);
    },
  });

  return { letterStatusMap: letterStatusMap!, updateLetterStatuses };
};
