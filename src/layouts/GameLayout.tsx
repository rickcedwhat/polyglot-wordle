import { FC } from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell, Box, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Sidebar } from '@/components/Sidebar/Sidebar';

export const GameLayout: FC = () => {
  // 1. Hook to manage the opened/closed state of the mobile sidebar
  const [opened, { toggle }] = useDisclosure();

  return (
    <Box h="100vh">
      <AppShell
        h="100%"
        // 2. Add a header for the burger menu to live in
        header={{ height: 60 }}
        // 3. Update the navbar prop to be collapsible on mobile
        navbar={{
          width: 150,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          {/* 4. This Burger is the button to toggle the sidebar, it's only visible on mobile */}
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" p="md" />
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Sidebar />
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </Box>
  );
};
