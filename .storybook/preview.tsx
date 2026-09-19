import '@mantine/core/styles.css';
import '../src/globals.css';

import React, { useEffect } from 'react';
import { addons } from '@storybook/preview-api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';
import { Box, MantineProvider, useMantineColorScheme } from '@mantine/core';
import { theme } from '../src/theme';

const channel = addons.getChannel();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export const parameters = {
  layout: 'fullscreen',
  options: {
    showPanel: false,
    storySort: (a, b) => {
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    },
  },
};

function ColorSchemeWrapper({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const handleColorScheme = (value: boolean) => setColorScheme(value ? 'dark' : 'light');

  useEffect(() => {
    channel.on(DARK_MODE_EVENT_NAME, handleColorScheme);
    return () => channel.off(DARK_MODE_EVENT_NAME, handleColorScheme);
  }, [channel]);

  return (
    <Box
      style={{
        minHeight: '100%',
        padding: '16px',
        background:
          colorScheme === 'light'
            ? 'radial-gradient(circle, #f8f9fa 0%, #e9ecef 100%)'
            : 'radial-gradient(circle, #2c2e33 0%, #1a1b1e 100%)',
        color: colorScheme === 'light' ? '#1a1b1e' : '#c1c2c5',
      }}
    >
      {children}
    </Box>
  );
}

export const decorators = [
  (renderStory: any) => (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <ColorSchemeWrapper>{renderStory()}</ColorSchemeWrapper>
      </MantineProvider>
    </QueryClientProvider>
  ),
];
