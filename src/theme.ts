import { createTheme } from '@mantine/core';

export const theme = createTheme({
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
