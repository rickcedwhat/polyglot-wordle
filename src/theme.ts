import { createTheme, DEFAULT_THEME } from '@mantine/core';

export const FLAG_FONT = 'Twemoji Country Flags';

export const theme = createTheme({
  fontFamily: `'${FLAG_FONT}', ${DEFAULT_THEME.fontFamily}`,
  headings: { fontFamily: `'${FLAG_FONT}', ${DEFAULT_THEME.fontFamily}` },
  components: {
    AppShell: {
      styles: {
        main: {
          // This tells the main content area to be transparent
          background: 'transparent',
        },
      },
    },
  },
});
