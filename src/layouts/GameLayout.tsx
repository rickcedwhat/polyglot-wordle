import { FC } from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell, Box, Burger, Group } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { Score } from '@/components/Score/Score';
import { Sidebar } from '@/components/Sidebar/Sidebar';

export const GameLayout: FC = () => {
  const [opened, { toggle }] = useDisclosure();
  // 1. Check if the screen is smaller than the 'sm' breakpoint.
  const isMobile = useMediaQuery('(max-width: 48em)'); // 48em is the default 'sm' breakpoint

  return (
    <Box h="100vh">
      <AppShell
        h="100%"
        // 2. Only define the header prop if we are on a mobile screen.
        header={isMobile ? { height: 60 } : undefined}
        navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        {isMobile && (
          <AppShell.Header p="md" style={{ display: 'flex', alignItems: 'center' }}>
            <Burger opened={opened} onClick={toggle} size="sm" />

            <Group justify="center" style={{ flex: 1 }}>
              {!opened && <Score />}
            </Group>

            {/* Invisible burger on the right to balance the layout */}
            <Burger size="sm" style={{ visibility: 'hidden' }} />
          </AppShell.Header>
        )}

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
