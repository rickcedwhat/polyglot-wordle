import { ReactNode, useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { GameSetupModal } from './GameSetupModal';

const FLAGS_KEY = 'polyglot_custom_flags_v2';

const WithCustomFlags = ({ children }: { children: ReactNode }) => {
  const [previous] = useState(() => {
    const saved = localStorage.getItem(FLAGS_KEY);
    localStorage.setItem(
      FLAGS_KEY,
      JSON.stringify({ en: '💂', es: '💃', fr: '🥐', it: '🍕', pt: '⚽' })
    );
    return saved;
  });
  useEffect(() => {
    const restore = () => {
      if (previous === null) {
        localStorage.removeItem(FLAGS_KEY);
      } else {
        localStorage.setItem(FLAGS_KEY, previous);
      }
    };
    window.addEventListener('pagehide', restore);
    return () => {
      window.removeEventListener('pagehide', restore);
      restore();
    };
  }, [previous]);
  return children;
};

const PREFS = {
  en: 'basic',
  es: 'intermediate',
  fr: 'basic',
  it: 'basic',
  pt: 'advanced',
} as const;

const meta: Meta<typeof GameSetupModal> = {
  title: 'Game setup/Picker',
  component: GameSetupModal,
  args: {
    opened: true,
    onClose: () => {},
    onSubmit: () => {},
    mode: 'newGame',
    initialLanguages: ['en', 'es', 'pt'],
    initialDifficulties: PREFS,
  },
};

export default meta;
type Story = StoryObj<typeof GameSetupModal>;

/** New Game with saved preferences. */
export const NewGame: Story = {};

/** First game ever: nothing saved yet, defaults to English / Spanish / French on Basic. */
export const FirstRun: Story = {
  args: { initialLanguages: null, initialDifficulties: null },
};

/** Sidebar → Game setup: saves preferences without starting a game. */
export const Settings: Story = {
  args: { mode: 'settings', initialSkipPicker: true },
};

/** Challenge a friend on a new game: picks for this game only, nothing saved. */
export const Challenge: Story = {
  args: { mode: 'challenge', title: 'Challenge Marido' },
};

/** The player's own emojis from Custom Flags / Emojis replace the defaults. */
export const CustomFlags: Story = {
  decorators: [
    (Story) => (
      <WithCustomFlags>
        <Story />
      </WithCustomFlags>
    ),
  ],
};

export const PhoneNewGame: Story = {
  parameters: { viewport: { defaultViewport: 'phone' } },
};

export const PhoneChallenge: Story = {
  args: { mode: 'challenge', title: 'Challenge Marido' },
  parameters: { viewport: { defaultViewport: 'phone' } },
};
