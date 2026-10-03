import type { Meta, StoryObj } from '@storybook/react';
import { HowToPlayModal } from './HowToPlayModal';

const meta: Meta<typeof HowToPlayModal> = {
  title: 'Help/How to Play',
  component: HowToPlayModal,
  args: { opened: true, onClose: () => {} },
};

export default meta;
type Story = StoryObj<typeof HowToPlayModal>;

/** Topic switcher (How to play, Scoring, Game setup, FAQ), each its own carousel. */
export const Default: Story = {};

export const Phone: Story = {
  parameters: { viewport: { defaultViewport: 'phone' } },
};
