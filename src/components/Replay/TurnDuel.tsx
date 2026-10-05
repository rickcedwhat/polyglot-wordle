import { CSSProperties, FC, useMemo, useRef, useState } from 'react';
import { Box, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { UserAvatar } from '@/components/UserAvatar/UserAvatar';
import { useCountUp } from '@/hooks/useCountUp';
import { useReplay } from '@/hooks/useReplay';
import type { Language } from '@/types/firestore';
import {
  buildDuelTimeline,
  duelBarMax,
  duelTotalMax,
  isLetterEvent,
  type DuelTurn,
} from '@/utils/duelReplay';
import { flagFor } from '@/utils/languages';
import { getGuessStatuses, type ScoreEvent } from '@/utils/wordUtils';
import { ReplayBar } from './ReplayBar';
import classes from './TurnDuel.module.css';

export interface DuelPlayer {
  id: string;
  name: string;
  photoURL?: string | null;
  /** Mantine color for this player's bars. */
  color: string;
  guesses: string[];
  scoringVersion?: number;
}

interface TurnDuelProps {
  words: Partial<Record<Language, string>>;
  languages: Language[];
  players: DuelPlayer[];
  scoringVersion: number;
  /** Open before turn 1 (default) or on the final standings. */
  startAt?: 'start' | 'end';
}

const bonusLabel = (event: ScoreEvent) => {
  const flag = event.lang ? flagFor(event.lang) : '';
  switch (event.kind) {
    case 'wordSolved':
      return `${flag} solved!`;
    case 'penalty':
      return `${flag} unsolved`;
    case 'crack':
      return 'first solve';
    case 'hatTrick':
      return 'hat trick';
    case 'gameSolved':
      return 'all solved!';
    default:
      return '';
  }
};

const signed = (points: number) => (points > 0 ? `+${points}` : `−${Math.abs(points)}`);

const Tiles: FC<{
  letters: string[];
  size: 'big' | 'mini';
  statuses?: string[];
  flipKey?: number;
}> = ({ letters, size, statuses, flipKey }) => (
  <div className={classes[size]} key={flipKey}>
    {Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={classes.tile}
        data-status={statuses?.[i]}
        data-flip={flipKey !== undefined || undefined}
        style={{ '--i': i } as CSSProperties}
      >
        {letters[i] ?? ''}
      </span>
    ))}
  </div>
);

interface LaneProps {
  player: DuelPlayer;
  timeline: DuelTurn[];
  step: number;
  /** Letters typed of this turn's guess, or null when not typing. */
  typing: number | null;
  /** Set when `step` was just played forward, so its animations run. */
  animateId: number | null;
  words: Partial<Record<Language, string>>;
  languages: Language[];
  barMax: number;
  totalMax: number;
}

const Lane: FC<LaneProps> = ({
  player,
  timeline,
  step,
  typing,
  animateId,
  words,
  languages,
  barMax,
  totalMax,
}) => {
  const now = timeline[step];
  const total = useCountUp(now.total, animateId !== null ? 1100 : 0);
  const finishedOn = player.guesses.length;
  const upcoming = typing !== null ? (player.guesses[step] ?? null) : null;
  const finished = typing !== null ? upcoming === null : step > 0 && now.guess === null;
  const turnPoints = now.events.reduce((sum, e) => sum + e.points, 0);
  const bonuses = now.events.filter((e) => !isLetterEvent(e) && e.points);

  const bigLetters =
    typing !== null ? (upcoming ?? '').slice(0, typing).split('') : (now.guess ?? '').split('');

  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      className={classes.lane}
      style={{ '--lane-color': `var(--mantine-color-${player.color}-5)` } as CSSProperties}
    >
      <div className={classes.player}>
        <UserAvatar src={player.photoURL} name={player.name} size={32} color={player.color} />
        <Text fw={700} fz={24} truncate>
          {player.name}
        </Text>
      </div>
      <div className={classes.scoreBar} data-negative={now.total < 0 || undefined}>
        <div className={classes.scoreTrack}>
          <div
            className={classes.scoreFill}
            style={{ width: `${(Math.max(0, now.total) / totalMax) * 100}%` }}
          />
        </div>
        <span className={classes.scoreValue}>
          {animateId !== null && turnPoints !== 0 && (
            <span
              key={animateId}
              className={classes.delta}
              data-negative={turnPoints < 0 || undefined}
            >
              {signed(turnPoints)}
            </span>
          )}
          <Text component="span" fw={800} fz="lg" className={classes.total}>
            {total < 0 ? `−${Math.abs(total)}` : total}
          </Text>
        </span>
        {animateId !== null &&
          bonuses.map((e, i) => (
            <span
              key={`${animateId}-${e.kind}-${e.lang ?? ''}`}
              className={classes.bonus}
              data-negative={e.points < 0 || undefined}
              style={{ '--i': i } as CSSProperties}
            >
              {signed(e.points)} {bonusLabel(e)}
            </span>
          ))}
      </div>

      {finished ? (
        <Text className={classes.finished} c="dimmed" fw={600}>
          Finished ✓ in {finishedOn}
        </Text>
      ) : (
        <Tiles letters={bigLetters} size="big" />
      )}

      <Stack gap={10} mt="sm">
        {languages.map((lang) => {
          const solvedOn = now.solvedOn[lang];
          const solvedEarlier =
            solvedOn !== undefined && solvedOn < (typing !== null ? step + 1 : step);
          const value = now.langTotals[lang] ?? 0;
          const langEvents =
            animateId !== null ? now.events.filter((e) => isLetterEvent(e) && e.lang === lang) : [];
          const langPoints = langEvents.reduce((sum, e) => sum + e.points, 0);
          const tone = langEvents.some((e) => e.kind === 'green') ? 'green' : 'yellow';

          let row;
          if (solvedEarlier) {
            const word = words[lang]!;
            row = (
              <span className={classes.solvedRow}>
                <Tiles letters={word.split('')} size="mini" statuses={Array(5).fill('correct')} />
              </span>
            );
          } else if (typing === null && now.guess) {
            row = (
              <Tiles
                letters={now.guess.split('')}
                size="mini"
                statuses={getGuessStatuses(now.guess, words[lang]!)}
                flipKey={animateId ?? undefined}
              />
            );
          } else {
            row = <Tiles letters={[]} size="mini" />;
          }

          return (
            <div key={lang} className={classes.langRow}>
              <span className={classes.flag}>{flagFor(lang)}</span>
              {row}
              <div className={classes.track}>
                <div
                  className={classes.fill}
                  data-solved={(solvedOn !== undefined && solvedOn <= step) || undefined}
                  data-unsolved={now.unsolved.includes(lang) || undefined}
                  style={{ width: `${(Math.max(0, value) / barMax) * 100}%` }}
                />
                {langPoints !== 0 && (
                  <span key={animateId} className={classes.chip} data-tone={tone}>
                    {signed(langPoints)}
                  </span>
                )}
              </div>
              <span className={classes.points}>{value}</span>
            </div>
          );
        })}
      </Stack>
    </Paper>
  );
};

/** Head-to-head replay, one turn at a time: both guesses, scored per language. */
export const TurnDuel: FC<TurnDuelProps> = ({
  words,
  languages,
  players,
  scoringVersion,
  startAt = 'start',
}) => {
  const turns = Math.max(...players.map((p) => p.guesses.length));
  const timelines = useMemo(
    () =>
      players.map((p) =>
        buildDuelTimeline(p.guesses, words, languages, p.scoringVersion ?? scoringVersion, turns)
      ),
    [players, words, languages, scoringVersion, turns]
  );
  const barMax = duelBarMax(timelines);
  const totalMax = duelTotalMax(timelines);
  const turnKeys = useMemo(() => Array.from({ length: turns }, () => '#####'), [turns]);
  const [landed, setLanded] = useState<{ step: number; id: number } | null>(null);
  const landedId = useRef(0);

  const replay = useReplay(turnKeys, {
    onGuessPlayed: (step) => {
      landedId.current += 1;
      setLanded({ step, id: landedId.current });
    },
    onJump: () => setLanded(null),
    startAt,
    typingDelayMs: 90,
    turnPauseMs: 2200,
  });
  const typing = replay.typedLetters?.length ?? null;
  const { step } = replay;
  const shownTurn = typing !== null ? step + 1 : step;
  const finals = timelines.map((timeline) => timeline[turns].total);
  const leader = finals[0] >= finals[1] ? 0 : 1;
  const margin = Math.abs(finals[0] - finals[1]);
  const result =
    margin === 0 ? 'Tied' : `${players[leader].name} won by ${margin.toLocaleString()}`;
  const heading =
    shownTurn === 0
      ? 'Head-to-head replay'
      : step >= turns && typing === null
        ? result
        : `Turn ${shownTurn} of ${turns}`;

  return (
    <Stack gap="md" w="100%" maw={860} mx="auto">
      <Text fw={700} ta="center">
        {heading}
      </Text>
      <SimpleGrid cols={{ base: 1, sm: players.length }} spacing="md">
        {players.map((player, i) => (
          <Lane
            key={player.id}
            player={player}
            timeline={timelines[i]}
            step={step}
            typing={typing}
            animateId={landed?.step === step && typing === null ? landed.id : null}
            words={words}
            languages={languages}
            barMax={barMax}
            totalMax={totalMax}
          />
        ))}
      </SimpleGrid>
      <Box>
        <ReplayBar replay={replay} stepLabel="turn" />
      </Box>
    </Stack>
  );
};
