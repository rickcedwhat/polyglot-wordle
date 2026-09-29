import { FC, memo, useEffect, useState } from 'react';
import { IconFlag, IconFlagFilled } from '@tabler/icons-react';
import {
  ActionIcon,
  Box,
  Group,
  Loader,
  Popover,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { MAX_GUESSES } from '@/config';
import { useRecordDefinitionRead } from '@/context/AchievementsContext';
import { useDefinition } from '@/hooks/useDefinition';
import { useFlaggedWords } from '@/hooks/useFlaggedWords';
import { useLanguageFlags } from '@/hooks/useLanguageFlags';
import { Language } from '@/types/firestore';
import { Dictionary, getGuessStatuses, normalizeWord } from '@/utils/wordUtils';
import { FormattedDefinition } from '../FormattedDefinition/FormattedDefinition';
import { LetterTile } from '../LetterTile/LetterTile';
import { SCORE_ORIGIN_ATTR, type ScoreBurst } from '../ScoreFlights/flightUtils';
import { BoardScorePopup, TILE_STAGGER_MS } from '../ScorePopups/ScorePopups';
import classes from './LanguageBoard.module.css';

/** Below this width tiles are too small to show points inside them. */
const COMPACT_BOARD_WIDTH = 180;

interface LanguageBoardProps {
  language: Language;
  solutionWord: string;
  submittedGuesses: string[];
  words: string[];
  dictionary?: Dictionary;
  candidateLanguages?: Language[];
  isConfirmed?: boolean;
  hideFlags?: boolean;
  isActive?: boolean;
  /** Render candidate flags above the grid instead of beside the current row. */
  flagsOnTop?: boolean;
  onActivate?: () => void;
  /** This board's score events from the latest guess. */
  scoreBurst?: ScoreBurst | null;
}

// 1. We create a dedicated component for a single, submitted guess row.
const SubmittedRow: FC<{
  guess: string;
  language: Language;
  solutionWord: string;
  languageMatch: boolean;
  isActive?: boolean;
  onActivate?: () => void;
  tilePoints?: (number | undefined)[];
}> = ({
  guess,
  language,
  solutionWord,
  languageMatch,
  isActive = true,
  onActivate,
  tilePoints,
}) => {
  const [opened, setOpened] = useState(false);
  const statuses = getGuessStatuses(guess, solutionWord);

  const { data, isLoading, isError, refetch } = useDefinition(language, guess);
  const { isFlagged, toggleFlag } = useFlaggedWords();
  const recordDefinitionRead = useRecordDefinitionRead();

  useEffect(() => {
    if (opened && data) {
      recordDefinitionRead(language, guess);
    }
  }, [opened, data, language, guess, recordDefinitionRead]);

  // Close the popover automatically whenever any key is pressed (typing a guess, backspace, etc.)
  useEffect(() => {
    if (!opened) {
      return;
    }

    const handleKeyDown = () => {
      setOpened(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [opened]);

  // While opened, continuously update popover position during board layout/flex transitions
  useEffect(() => {
    if (!opened) {
      return;
    }

    let frameId: number;
    const start = performance.now();
    const duration = 500;

    const track = (now: number) => {
      window.dispatchEvent(new Event('resize'));
      if (now - start < duration) {
        frameId = requestAnimationFrame(track);
      }
    };

    frameId = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frameId);
  }, [opened, isActive]);

  const handleClick = () => {
    if (languageMatch) {
      refetch();
      if (!isActive && onActivate) {
        onActivate();
        if (!opened) {
          setTimeout(() => {
            setOpened(true);
          }, 150);
        } else {
          setOpened(false);
        }
      } else {
        setOpened((prev) => !prev);
      }
    }
  };

  const flagged = data ? isFlagged(language, guess) : false;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom"
      withArrow
      shadow="md"
      width={280}
      closeOnClickOutside
      closeOnEscape
    >
      <Popover.Target>
        <UnstyledButton
          onClick={handleClick}
          className={`${classes.rowButton} ${languageMatch ? classes.languageMatch : ''}`}
          style={{ cursor: languageMatch ? 'pointer' : 'default', width: '100%', display: 'block' }}
        >
          <Group gap="xs" wrap="nowrap" grow w="100%">
            {guess.split('').map((letter, colIndex) => (
              <Box key={colIndex} style={{ flex: 1 }} className={classes.tileWrapper}>
                <LetterTile
                  letter={letter.toUpperCase()}
                  status={statuses[colIndex]}
                  points={tilePoints?.[colIndex]}
                  revealDelayMs={colIndex * TILE_STAGGER_MS}
                />
              </Box>
            ))}
          </Group>
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown>
        {isLoading && <Loader size="xs" />}
        {isError && (
          <Text size="sm" c="dimmed">
            Definition not found.
          </Text>
        )}
        {data && (
          <Stack gap={2}>
            <Group justify="space-between" align="center">
              <Group gap={6} align="baseline">
                <Text size="sm" fw={700}>
                  {data.display}
                </Text>
                <Text size="xs" c="dimmed" fs="italic">
                  ({data.pos})
                </Text>
              </Group>
              <Tooltip label={flagged ? 'Unflag word' : 'Flag word for AI discussion'}>
                <ActionIcon
                  size="xs"
                  variant={flagged ? 'filled' : 'light'}
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFlag({
                      lang: language,
                      wordKey: guess,
                      display: data.display || guess,
                      pos: data.pos,
                      d: data.d,
                      def: data.def,
                    });
                  }}
                >
                  {flagged ? <IconFlagFilled size={12} /> : <IconFlag size={12} />}
                </ActionIcon>
              </Tooltip>
            </Group>
            <FormattedDefinition def={data.def} size="sm" />
          </Stack>
        )}
      </Popover.Dropdown>
    </Popover>
  );
};

const CandidateFlags: FC<{
  candidateLanguages: Language[];
  flags: Record<Language, string>;
  placement: 'above' | 'beside';
  large?: boolean;
}> = ({ candidateLanguages, flags, placement, large = false }) => (
  <Box
    className={
      placement === 'above'
        ? `${classes.flagsAbove} ${large ? classes.large : ''}`
        : classes.flagsBeside
    }
  >
    {candidateLanguages.map((cand) => (
      <Text key={cand} size="md" className={classes.flagEmoji}>
        {flags[cand]}
      </Text>
    ))}
  </Box>
);

// 2. The main LanguageBoard component.
const LanguageBoard: FC<LanguageBoardProps> = memo(
  ({
    language,
    solutionWord,
    submittedGuesses,
    words,
    dictionary,
    candidateLanguages = ['en', 'es', 'fr'] as Language[],
    isConfirmed: _isConfirmed = false,
    hideFlags = false,
    isActive = true,
    flagsOnTop = false,
    onActivate,
    scoreBurst,
  }) => {
    const { flags } = useLanguageFlags();
    const { ref: boardRef, width: boardWidth } = useElementSize();
    const isCompact = boardWidth > 0 && boardWidth < COMPACT_BOARD_WIDTH;
    const latestRowIndex = submittedGuesses.length - 1;
    const latestTilePoints =
      scoreBurst && !isCompact
        ? Array.from({ length: 5 }, (_, i) =>
            scoreBurst.events.filter((e) => e.index === i).reduce((total, e) => total + e.points, 0)
          ).map((points) => points || undefined)
        : undefined;

    const normalizedSolution = normalizeWord(solutionWord);
    let lastRelevantGuessIndex = submittedGuesses.indexOf(normalizedSolution);
    if (lastRelevantGuessIndex === -1) {
      lastRelevantGuessIndex = submittedGuesses.length - 1;
    }

    const emptyRowsCount = MAX_GUESSES - lastRelevantGuessIndex - 1;
    const relevantGuesses = submittedGuesses.slice(0, lastRelevantGuessIndex + 1);

    // Target row index for side-aligned flags:
    // Align with the latest guess row, or row 0 (top-aligned) if no guesses yet.
    const targetRowIndex = relevantGuesses.length === 0 ? 0 : relevantGuesses.length - 1;
    const flagsAbove = flagsOnTop && !hideFlags;
    const showSideFlags = !hideFlags && !flagsAbove;

    const resolveDisplayGuess = (guess: string) => {
      const normGuess = normalizeWord(guess);
      const isSolution = normGuess === normalizeWord(solutionWord);
      const matchingWordKey = words.find((word) => normalizeWord(word) === normGuess);
      const languageMatch = !!matchingWordKey || isSolution;
      const dictEntry =
        dictionary?.[normGuess] || (matchingWordKey ? dictionary?.[matchingWordKey] : undefined);
      const displayGuess =
        dictEntry?.display ||
        (matchingWordKey && dictionary?.[matchingWordKey]?.display) ||
        matchingWordKey ||
        (isSolution ? solutionWord : guess);
      return { displayGuess, languageMatch };
    };

    const renderEmptyTiles = () => (
      <Group gap="xs" wrap="nowrap" grow w="100%">
        {Array.from({ length: 5 }).map((_, colIndex) => (
          <Box key={colIndex} style={{ flex: 1 }} className={classes.tileWrapper}>
            <LetterTile letter="" status="unknown" />
          </Box>
        ))}
      </Group>
    );

    return (
      <Box
        ref={boardRef}
        h="100%"
        w="100%"
        pos="relative"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        {scoreBurst && !(isCompact && scoreBurst.fly) && (
          <BoardScorePopup key={scoreBurst.id} events={scoreBurst.events} compact={isCompact} />
        )}
        {flagsAbove && (
          <CandidateFlags
            candidateLanguages={candidateLanguages}
            flags={flags}
            placement="above"
            large={isActive}
          />
        )}
        <Stack gap="xs" style={{ width: '100%' }} mx="auto">
          {relevantGuesses.map((guess, rowIndex) => {
            const { displayGuess, languageMatch } = resolveDisplayGuess(guess);
            const showFlagHere = showSideFlags && rowIndex === targetRowIndex;
            const originProps =
              rowIndex === latestRowIndex ? { [SCORE_ORIGIN_ATTR]: language } : undefined;
            const row = (
              <SubmittedRow
                guess={displayGuess}
                solutionWord={solutionWord}
                language={language}
                languageMatch={languageMatch}
                isActive={isActive}
                onActivate={onActivate}
                tilePoints={rowIndex === latestRowIndex ? latestTilePoints : undefined}
              />
            );

            if (!showSideFlags) {
              return (
                <Box key={rowIndex} {...originProps}>
                  {row}
                </Box>
              );
            }

            return (
              <Group key={rowIndex} gap={4} wrap="nowrap" align="center" style={{ width: '100%' }}>
                <Box style={{ flex: 1, minWidth: 0 }} {...originProps}>
                  {row}
                </Box>
                <Box className={classes.flagGutter}>
                  {showFlagHere && (
                    <CandidateFlags
                      candidateLanguages={candidateLanguages}
                      flags={flags}
                      placement="beside"
                    />
                  )}
                </Box>
              </Group>
            );
          })}
          {Array.from({ length: emptyRowsCount }).map((_, rowIndex) => {
            const actualRowIndex = relevantGuesses.length + rowIndex;
            const showFlagHere =
              showSideFlags && relevantGuesses.length === 0 && actualRowIndex === 0;

            if (!showSideFlags) {
              return <Box key={`empty-${rowIndex}`}>{renderEmptyTiles()}</Box>;
            }

            return (
              <Group
                key={`empty-${rowIndex}`}
                gap={4}
                wrap="nowrap"
                align="center"
                style={{ width: '100%' }}
              >
                <Box style={{ flex: 1, minWidth: 0 }}>{renderEmptyTiles()}</Box>
                <Box className={classes.flagGutter}>
                  {showFlagHere && (
                    <CandidateFlags
                      candidateLanguages={candidateLanguages}
                      flags={flags}
                      placement="beside"
                    />
                  )}
                </Box>
              </Group>
            );
          })}
        </Stack>
      </Box>
    );
  }
);

export default LanguageBoard;
