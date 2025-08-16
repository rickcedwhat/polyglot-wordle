import '@mantine/core/styles.css';
import '@mantine/carousel/styles.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MantineProvider } from '@mantine/core';
import { AuthProvider } from '@/context/AuthContext';
import { ScoreProvider } from './context/ScoreContext';
import { Router } from './Router';
import { theme } from './theme';

// Create a client instance
const queryClient = new QueryClient();

export default function App() {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <AuthProvider>
          <ScoreProvider>
            <Router />
          </ScoreProvider>
        </AuthProvider>
      </MantineProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
