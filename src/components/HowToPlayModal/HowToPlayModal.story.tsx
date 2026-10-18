import type { Meta, StoryObj } from '@storybook/react';
import { HowToPlayModal } from './HowToPlayModal';

const meta: Meta<typeof HowToPlayModal> = {
  title: 'Help/How to Play',
  component: HowToPlayModal,
  args: { opened: true, onClose: () => {} },
};

export default meta;
type Story = StoryObj<typeof HowToPlayModal>;

/** A single topic carousel, selected from the sidebar help navigation. */
export const Default: Story = {};

export const Phone: Story = {
  parameters: { viewport: { defaultViewport: 'phone' } },
};

export const Scoring: Story = { args: { initialTopic: 'scoring' } };
export const GameSetup: Story = { args: { initialTopic: 'setup' } };
export const LetterJumble: Story = { args: { initialTopic: 'jumble' } };
export const FAQ: Story = { args: { initialTopic: 'faq' } };
