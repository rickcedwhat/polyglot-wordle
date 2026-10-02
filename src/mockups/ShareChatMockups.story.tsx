import type { Meta, StoryObj } from '@storybook/react';
import { Box, Group, Stack, Text } from '@mantine/core';

const LINK = 'https://polyglot-wordle.web.app/game/en-es-pt/3139…041v?challenger=ced';
const HEADER = '🇬🇧 🇪🇸 🇵🇹 • 1357 pts';

/** The 1357-pt game from the screenshot, in board order. `x` = not in word. */
const BOARDS = [
  ['xxx🟩🟩', 'xx🟩🟩🟩', 'xxxx🟨', 'xxxx🟩', 'x🟩xxx', '🟩🟩🟩🟩🟩'],
  ['🟩x🟨xx', 'x🟨🟨xx', '🟩🟨🟩x🟨', 'xxxxx', '🟩🟩🟩🟩x', '🟨🟩xxx', '🟩🟩🟩🟩🟩'],
  ['xxxx🟩', '🟩xxx🟩', 'xxx🟨x', '🟩🟩🟩🟩🟩'],
];
const TURNS = Math.max(...BOARDS.map((b) => b.length));

const row = (board: string[], i: number) => (board[i] ? board[i].replaceAll('x', '⬜') : '⬛⬛⬛⬛⬛');
const grid = (board: string[], rows: number) => Array.from({ length: rows }, (_, i) => row(board, i));
const solvedOn = (board: string[]) => `${board.length}/8`;

const OPTIONS = [
  {
    label: 'Current — side by side (what broke)',
    text: [
      HEADER,
      ...Array.from({ length: 8 }, (_, i) => BOARDS.map((b) => row(b, i)).join('  ')),
      'Can you beat me?',
    ].join('\n'),
  },
  {
    label: 'A — stacked, trimmed to turns played',
    text: [HEADER, '', ...BOARDS.flatMap((b, i) => [...grid(b, TURNS), ...(i < 2 ? [''] : [])]), '', 'Can you beat me?'].join('\n'),
  },
  {
    label: 'B — stacked, full 8 rows',
    text: [HEADER, '', ...BOARDS.flatMap((b, i) => [...grid(b, 8), ...(i < 2 ? [''] : [])]), '', 'Can you beat me?'].join('\n'),
  },
  {
    label: 'C — one line per board',
    text: [HEADER, '', ...BOARDS.map((b) => `${row(b, b.length - 1)} ${solvedOn(b)}`), '', 'Can you beat me?'].join('\n'),
  },
];

const THEMES = {
  dark: { bg: '#000', bubble: '#262628', text: '#fff', link: '#0a84ff' },
  light: { bg: '#fff', bubble: '#e9e9eb', text: '#000', link: '#007aff' },
};

/** 390px is an iPhone 14/15 screen; received bubbles cap at roughly 75% of that. */
const Phone = ({ text, mode }: { text: string; mode: keyof typeof THEMES }) => {
  const t = THEMES[mode];
  return (
    <Box
      style={{
        width: 390,
        background: t.bg,
        borderRadius: 32,
        border: '6px solid #222',
        padding: '16px 12px',
      }}
    >
      <Box
        style={{
          maxWidth: 292,
          background: t.bubble,
          color: t.text,
          borderRadius: 18,
          padding: '8px 12px',
          fontSize: 17,
          lineHeight: 1.25,
          whiteSpace: 'pre-wrap',
          fontFamily: '-apple-system, system-ui, sans-serif',
        }}
      >
        {text}
        {'\n'}
        <span style={{ color: t.link, textDecoration: 'underline', wordBreak: 'break-all' }}>{LINK}</span>
      </Box>
    </Box>
  );
};

const Comparison = () => (
  <Group align="flex-start" gap={32} p="lg" wrap="nowrap">
    {OPTIONS.map(({ label, text }) => (
      <Stack key={label} gap="xs">
        <Text fw={700} w={390}>
          {label}
        </Text>
        <Phone text={text} mode="dark" />
        <Phone text={text} mode="light" />
      </Stack>
    ))}
  </Group>
);

const meta: Meta = { title: 'Mockups/Share Grid on Phone', parameters: { layout: 'fullscreen' } };
export default meta;

export const PhoneWidth: StoryObj = { render: () => <Comparison /> };
