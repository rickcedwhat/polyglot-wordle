import { FC } from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell, Box } from '@mantine/core';
import { Sidebar } from '@/components/Sidebar/Sidebar';

export const GameLayout: FC = () => {
  return (
    // 1. Wrap the AppShell in a Box that takes up 100% of the viewport height.
    <Box h="100vh">
      <AppShell
        h="100%" // 2. Make the AppShell fill the Box.
        navbar={{ width: 150, breakpoint: 'sm' }}
        padding="md"
      >
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
