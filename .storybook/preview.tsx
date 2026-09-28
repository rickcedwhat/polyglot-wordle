import '@mantine/core/styles.css';
import '../src/globals.css';

import React, { useEffect } from 'react';
import { addons } from '@storybook/preview-api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';
import { Box, MantineProvider, useMantineColorScheme } from '@mantine/core';
import { theme } from '../src/theme';

const channel = addons.getChannel();
function StoryQueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const viewport = (name: string, width: number, height: number, type: string) => ({
  name,
  styles: { width: `${width}px`, height: `${height}px` },
  type,
});

export const parameters = {
  layout: 'fullscreen',
  viewport: {
    viewports: {
      phone: viewport('Phone 375×667', 375, 667, 'mobile'),
      phoneLarge: viewport('Large phone 430×932', 430, 932, 'mobile'),
      tablet: viewport('Tablet 768×1024', 768, 1024, 'tablet'),
      laptop: viewport('Laptop 1280×800', 1280, 800, 'desktop'),
      desktop: viewport('Desktop 1440×900', 1440, 900, 'desktop'),
      tv1080: viewport('TV 1080p 1920×1080', 1920, 1080, 'desktop'),
    },
  },
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
  (renderStory: any, context: { id: string }) => (
    <StoryQueryClientProvider key={context.id}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <ColorSchemeWrapper>{renderStory()}</ColorSchemeWrapper>
      </MantineProvider>
    </StoryQueryClientProvider>
  ),
];
