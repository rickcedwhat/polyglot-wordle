import { FC } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { AppShell, Box, Burger, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Score } from '@/components/Score/Score';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useSidebar } from '@/context/SidebarContext';

export const SidebarLayout: FC = () => {
  const { opened, toggle } = useSidebar();
  const isMobile = useMediaQuery('(max-width: 48em)'); // 48em is the default 'sm' breakpoint
  const isGamePage = useMatch('/game/:uuid');

  return (
    <Box h="100vh">
      <AppShell
        h="100%"
        header={isMobile ? { height: 60 } : undefined}
        navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        {isMobile && (
          <AppShell.Header p="md" style={{ display: 'flex', alignItems: 'center' }}>
            <Burger opened={opened} onClick={toggle} size="sm" />

            <Group justify="center" style={{ flex: 1 }}>
              {!opened && isGamePage && <Score orientation="horizontal" />}
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
