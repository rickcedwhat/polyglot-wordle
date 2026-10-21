import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Box } from '@mantine/core';
import type { HelpTopic } from '@/components/HowToPlayModal/HelpSlides';
import { HowToPlayModal } from '@/components/HowToPlayModal/HowToPlayModal';
import { SidebarNavigation } from './SidebarNavigation';

const noop = () => {};
const Navigation = ({
  settingsExpanded,
  helpExpanded,
}: {
  settingsExpanded?: boolean;
  helpExpanded?: boolean;
}) => {
  const location = useLocation();
  const [topic, setTopic] = useState<HelpTopic>('play');
  const [opened, setOpened] = useState(false);
  return (
    <>
      <HowToPlayModal opened={opened} initialTopic={topic} onClose={() => setOpened(false)} />
      <SidebarNavigation
        currentPath={location.pathname}
        user={{ uid: 'me', displayName: 'Cedrick' }}
        unreadCount={2}
        settingsExpanded={settingsExpanded}
        helpExpanded={helpExpanded}
        activeHelpTopic={opened ? topic : undefined}
        onNavigate={noop}
        onNewGame={noop}
        onHelpTopic={(selected) => {
          setTopic(selected);
          setOpened(true);
        }}
        onSetup={noop}
        onFlags={noop}
        onLanguage={noop}
        onLogout={noop}
      />
    </>
  );
};
const SidebarNavigationPreview = ({
  initialPage = 'home',
  settingsExpanded = false,
  helpExpanded = false,
}: {
  initialPage?: string;
  settingsExpanded?: boolean;
  helpExpanded?: boolean;
}) => (
  <MemoryRouter initialEntries={[initialPage === 'home' ? '/' : `/${initialPage}`]}>
    <Navigation settingsExpanded={settingsExpanded} helpExpanded={helpExpanded} />
  </MemoryRouter>
);
const meta: Meta<typeof SidebarNavigationPreview> = {
  title: 'Navigation/Sidebar',
  component: SidebarNavigationPreview,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <Box p="md" style={{ display: 'flex', justifyContent: 'center', minHeight: '100vh' }}>
        <Box w={248} h={720}>
          <Story />
        </Box>
      </Box>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SidebarNavigationPreview>;
export const Home: Story = {};
export const ActivityFeed: Story = { args: { initialPage: 'feed' } };
export const SettingsExpanded: Story = { args: { initialPage: 'feed', settingsExpanded: true } };
export const HelpExpanded: Story = { args: { initialPage: 'feed', helpExpanded: true } };
