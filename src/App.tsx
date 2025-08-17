import '@mantine/core/styles.css';
import '@mantine/carousel/styles.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import cx from 'clsx';
import { Box, MantineProvider, useComputedColorScheme } from '@mantine/core';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ScoreProvider } from './context/ScoreContext';
import { Router } from './Router';
import { theme } from './theme';
import classes from './App.module.css';

// Create a client instance
const queryClient = new QueryClient();

export default function App() {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <AuthProvider>
          <SidebarProvider>
            <ScoreProvider>
              <AppContainer />
            </ScoreProvider>
          </SidebarProvider>
        </AuthProvider>
      </MantineProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

function AppContainer() {
  const colorScheme = useComputedColorScheme('dark');

  return (
    // Apply the styles to a root Box component
    <Box className={cx(classes.root, { [classes.light]: colorScheme === 'light' })}>
      <Router />
    </Box>
  );
}
