import '@mantine/core/styles.css';

import React, { useEffect } from 'react';
import { addons } from '@storybook/preview-api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';
import { MantineProvider, useMantineColorScheme } from '@mantine/core';
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
  const { setColorScheme } = useMantineColorScheme();
  const handleColorScheme = (value: boolean) => setColorScheme(value ? 'dark' : 'light');

  useEffect(() => {
    channel.on(DARK_MODE_EVENT_NAME, handleColorScheme);
    return () => channel.off(DARK_MODE_EVENT_NAME, handleColorScheme);
  }, [channel]);

  return children;
}

export const decorators = [
  (renderStory: any) => (
    <QueryClientProvider client={queryClient}>
      <ColorSchemeWrapper>
        <MantineProvider theme={theme}>{renderStory()}</MantineProvider>
      </ColorSchemeWrapper>
    </QueryClientProvider>
  ),
];
