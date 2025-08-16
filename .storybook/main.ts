import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  core: {
    disableWhatsNewNotifications: true,
    disableTelemetry: true,
    enableCrashReports: false,
  },
  stories: ['../src/**/*.mdx', '../src/**/*.story.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials', // Bundles core features like Controls, Actions, and Docs
    '@storybook/addon-interactions', // For testing user interactions
    'storybook-dark-mode', // For easy light/dark theme switching
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
