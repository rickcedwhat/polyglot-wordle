import { FC } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { AppShell, Box, Burger } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ScoreHeader } from '@/components/Score/Score';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useSidebar } from '@/context/SidebarContext';

export const SidebarLayout: FC = () => {
  const { opened, toggle, onOpenSummary } = useSidebar();
  const isMobile = useMediaQuery('(max-width: 48em)'); // 48em is the default 'sm' breakpoint
  const matchLegacyGame = useMatch('/game/:uuid');
  const matchLangGame = useMatch('/game/:languages/:uuid');
  const isGamePage = Boolean(matchLegacyGame || matchLangGame);

  return (
    <Box h="100dvh">
      <AppShell
        h="100%"
        header={isMobile ? { height: 60 } : undefined}
        navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        {isMobile && (
          <AppShell.Header p="md" style={{ display: 'flex', alignItems: 'center' }}>
            <ScoreHeader
              menu={<Burger opened={opened} onClick={toggle} size="sm" />}
              showScore={!opened && isGamePage}
              onOpenSummary={onOpenSummary}
            />
          </AppShell.Header>
        )}

        <AppShell.Navbar p="md">
          <Sidebar />
        </AppShell.Navbar>

        {/* A fixed height lets the live game's boards shrink to fit instead of scrolling. */}
        <AppShell.Main h={isGamePage ? '100dvh' : undefined}>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </Box>
  );
};
