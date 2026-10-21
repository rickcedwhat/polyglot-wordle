import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { IconBell, IconX } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { ReactionBar } from '@/components/ActivityTimeline/ActivityReactions';
import { ActivityTimeline } from '@/components/ActivityTimeline/ActivityTimeline';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import { SidebarNavigation } from '@/components/Sidebar/SidebarNavigation';
import type { ReactionEmoji } from '@/hooks/useActivityReactions';
import { MockAuth } from '@/storybook/MockAuth';
import { buildTimeline, type ActivityRecord, type ReactionTarget } from '@/utils/activityTimeline';
import { ReactionInbox, type ReactionNotice } from './ReactionInbox';
import classes from './ReactionNotifications.story.module.css';

const INITIAL: ReactionNotice[] = [
  {
    id: 'game',
    actor: 'Alex Rivera',
    summary: 'Alex and 2 others reacted to your game',
    target: 'English · Spanish · French',
    when: '2 min ago',
    emojis: '👏 3   🔥 2',
    unread: true,
  },
  {
    id: 'cert',
    actor: 'Mina Chen',
    summary: 'Mina reacted to your certification',
    target: 'Portuguese B1',
    when: '18 min ago',
    emojis: '❤️ 1',
    unread: true,
  },
  {
    id: 'best',
    actor: 'Sam Okafor',
    summary: 'Sam reacted to your personal best',
    target: '1,530 pts',
    when: 'Yesterday',
    emojis: '🤯 1   👏 1',
    unread: false,
  },
];
const game = {
  id: 'me_preview',
  userId: 'me',
  gameId: 'preview',
  words: { en: 'apple', es: 'queso', fr: 'fruit' },
  difficulties: {},
  shuffledLanguages: ['en', 'es', 'fr'] as ('en' | 'es' | 'fr')[],
  guessHistory: ['crane', 'apple', 'queso', 'fruit'],
  isLiveGame: false,
  isWin: true,
  score: 1530,
  startedAt: Timestamp.fromMillis(1792420000000),
  completedAt: Timestamp.fromMillis(1792420400000),
};
const RECORDS: ActivityRecord[] = [
  { type: 'game', game },
  {
    type: 'certification',
    certification: {
      id: 'cert_me_pt_2',
      userId: 'me',
      lang: 'pt',
      level: 2,
      wordCount: 150,
      createdAt: Timestamp.fromMillis(1792420300000),
    },
  },
  {
    type: 'game',
    game: {
      ...game,
      id: 'me_best',
      gameId: 'best',
      activity: { feats: [], firstGame: false, personalBest: true, streak: null },
      completedAt: Timestamp.fromMillis(1792334000000),
    },
  },
];
const noop = () => {};
const PreviewReactions = ({ target }: { target: ReactionTarget }) => {
  const [selected, setSelected] = useState<ReactionEmoji[]>([]);
  return (
    <ReactionBar
      userId="me"
      reactions={selected.map((emoji) => ({ userId: 'me', emoji, targetKey: target.sourceId }))}
      onToggle={(emoji, on) =>
        setSelected((old) => (on ? [...old, emoji] : old.filter((item) => item !== emoji)))
      }
    />
  );
};
const ReactionNotificationsPreview = ({
  mode = 'inbox',
}: {
  mode?: 'inbox' | 'playing' | 'empty';
}) => {
  const client = useQueryClient();
  useState(() => {
    client.setQueryData(['userProfile', 'me'], {
      displayName: 'Cedrick',
      photoURL: '',
      pinnedGames: [],
    });
    client.setQueryData(['vocabulary', 'me'], { en: {}, es: {}, fr: {}, it: {}, pt: {} });
  });
  const [items, setItems] = useState(mode === 'empty' ? [] : INITIAL);
  const [playing, setPlaying] = useState(mode === 'playing');
  const [toast, setToast] = useState(mode === 'playing');
  const [selected, setSelected] = useState<ReactionNotice | null>(null);
  const count = items.filter((item) => item.unread).length;
  const readAll = () => setItems((old) => old.map((item) => ({ ...item, unread: false })));
  const open = (notice: ReactionNotice) => {
    setItems((old) =>
      old.map((item) => (item.id === notice.id ? { ...item, unread: false } : item))
    );
    setSelected(notice);
  };
  const entries = buildTimeline(RECORDS).filter((entry) =>
    selected?.id === 'cert'
      ? entry.type === 'certification'
      : selected?.id === 'best'
        ? entry.type === 'personalBest'
        : entry.type === 'games' && entry.games.some((item) => item.id === game.id)
  );
  const pools = { dictionaries: {}, master: {} };
  return (
    <div className={classes.layout}>
      <aside className={classes.sidebar}>
        <SidebarNavigation
          currentPath={playing ? '/game/preview' : '/feed'}
          user={{ uid: 'me', displayName: 'Cedrick' }}
          activityUnreadCount={count}
          unreadCount={1}
          onNavigate={() => {
            setPlaying(false);
            setSelected(null);
            setToast(false);
          }}
          onNewGame={noop}
          onHelpTopic={noop}
          onSetup={noop}
          onFlags={noop}
          onLanguage={noop}
          onLogout={noop}
        />
      </aside>
      <Container size={740} className={classes.main}>
        <Stack gap="lg">
          <Group justify="space-between">
            <div>
              <Title order={1} size={28}>
                {playing ? 'Your game' : 'Activity feed'}
              </Title>
              <Text c="dimmed" size="sm" mt={4}>
                {playing
                  ? 'English · Spanish · French'
                  : 'Games, milestones, and moments worth sharing.'}
              </Text>
            </div>
            <Badge variant="outline" color="gray">
              Design preview
            </Badge>
          </Group>
          {playing ? (
            <>
              <Text size="sm" c="dimmed">
                Guess 2 of 8
              </Text>
              <Box h={430}>
                <GameBoard
                  solution={game.words}
                  guesses={['crane']}
                  shuffledLanguages={game.shuffledLanguages}
                  wordPoolsOverride={pools}
                />
              </Box>
              {!toast && (
                <Button variant="light" onClick={() => setToast(true)}>
                  Preview incoming reaction
                </Button>
              )}
            </>
          ) : (
            <>
              {!selected ? (
                <ReactionInbox items={items} onOpen={open} onReadAll={readAll} />
              ) : (
                <>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    w="fit-content"
                    onClick={() => setSelected(null)}
                  >
                    ← Back to reactions
                  </Button>
                  <Paper withBorder radius="md" p="md">
                    <Text size="sm" c="dimmed">
                      Activity opened from your notification
                    </Text>
                    <Text size="sm" mt={4}>
                      {selected.summary}
                    </Text>
                  </Paper>
                  <ActivityTimeline
                    key={selected.id}
                    entries={entries}
                    initiallyExpanded="details"
                    renderReactions={(target) => <PreviewReactions target={target} />}
                  />
                </>
              )}
              {!selected && (
                <div>
                  <Text size="sm" fw={650} mb="sm">
                    Latest activity
                  </Text>
                  <ActivityTimeline
                    entries={buildTimeline(RECORDS).slice(0, 2)}
                    renderReactions={(target) => <PreviewReactions target={target} />}
                  />
                </div>
              )}
            </>
          )}
          <Text size="xs" c="dimmed">
            Storybook fixture · inbox, read state, and reactions stay local
          </Text>
        </Stack>
      </Container>
      {playing && toast && (
        <Paper withBorder shadow="lg" radius="md" p="md" className={classes.toast} role="status">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <IconBell size={19} />
            <div className={classes.toastContent}>
              <Text size="sm" fw={650}>
                Alex and 2 others reacted 👏 🔥
              </Text>
              <Text size="xs" c="dimmed" mt={3}>
                Your English · Spanish · French game
              </Text>
              <Button
                variant="subtle"
                size="compact-xs"
                mt="sm"
                onClick={() => {
                  setPlaying(false);
                  setToast(false);
                  open(INITIAL[0]);
                }}
              >
                View activity
              </Button>
            </div>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Dismiss reaction notification"
              onClick={() => setToast(false)}
            >
              <IconX size={15} />
            </ActionIcon>
          </Group>
        </Paper>
      )}
    </div>
  );
};
const meta: Meta<typeof ReactionNotificationsPreview> = {
  title: 'Social/Reaction notifications',
  component: ReactionNotificationsPreview,
  parameters: { layout: 'fullscreen', fullBleed: true },
  decorators: [
    (Story) => (
      <MockAuth>
        <Story />
      </MockAuth>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ReactionNotificationsPreview>;
export const Inbox: Story = {};
export const DuringGame: Story = { args: { mode: 'playing' } };
export const AllCaughtUp: Story = { args: { mode: 'empty' } };
