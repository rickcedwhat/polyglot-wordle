// vite.config.mjs
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
    exclude: [...configDefaults.exclude, 'functions/**'],
  },
  // resolve: {
  //   alias: {
  //     '@': path.resolve(__dirname, './src'),
  //   },
  // },
});
