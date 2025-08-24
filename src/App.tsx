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

import './globals.css';

const defaultErrorHandler = (error: unknown) => {
  // `import.meta.env.DEV` is a boolean provided by Vite.
  // This code block will only run in your development environment.
  if (import.meta.env.DEV) {
    console.error('Global Query Error:', error);
  }

  // Best Practice:
  // - Return `false` in dev to prevent your UI from breaking on every error.
  // - Return `true` in prod to allow Error Boundaries to catch the error and
  //   show a user-friendly message instead of a broken app.
  return !import.meta.env.DEV;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // All queries will now use this error handling logic by default
      throwOnError: defaultErrorHandler,

      // You can set other defaults here as well
      // staleTime: 1000 * 60 * 5, // 5 minutes
      // gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

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
