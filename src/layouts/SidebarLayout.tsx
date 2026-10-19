import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useMatch } from 'react-router-dom';
import { AppShell, Box, Burger, Group, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { NewGameButton } from '@/components/NewGameButton/NewGameButton';
import { ScoreHeader } from '@/components/Score/Score';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useSidebar } from '@/context/SidebarContext';

export const SidebarLayout: FC = () => {
  const { t } = useTranslation();
  const { opened, toggle, onOpenSummary } = useSidebar();
  const isMobile = useMediaQuery('(max-width: 48em)'); // 48em is the default 'sm' breakpoint
  const isHomePage = !!useMatch('/');
  const matchLegacyGame = useMatch('/game/:uuid');
  const matchLangGame = useMatch('/game/:languages/:uuid');
  const isGamePage = Boolean(matchLegacyGame || matchLangGame);

  return (
    <Box h="100dvh">
      <AppShell
        h="100%"
        header={isMobile ? { height: 60 } : undefined}
        navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        {isMobile && (
          <AppShell.Header p="md" style={{ display: 'flex', alignItems: 'center' }}>
            {isHomePage ? (
              <Group justify="space-between" w="100%" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <Burger
                    opened={opened}
                    onClick={toggle}
                    size="sm"
                    aria-label={t('nav.mainNavigation')}
                  />
                  <Text size="sm" fw={700}>
                    Polyglot Wordle
                  </Text>
                </Group>
                <NewGameButton />
              </Group>
            ) : (
              <ScoreHeader
                menu={<Burger opened={opened} onClick={toggle} size="sm" />}
                showScore={!opened && isGamePage}
                onOpenSummary={onOpenSummary}
              />
            )}
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
