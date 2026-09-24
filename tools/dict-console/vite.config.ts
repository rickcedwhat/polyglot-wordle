import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scaffoldUi = path.resolve(__dirname, '../../../scaffold/packages/ui/src');
const scaffoldRoot = path.resolve(__dirname, '../../../scaffold');

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      // Live-link scaffold UI source so local edits HMR into this console
      '@scaffold/ui': scaffoldUi,
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.DICT_CONSOLE_UI_PORT || 4091),
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, '../..'), scaffoldRoot],
    },
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.DICT_CONSOLE_API_PORT || 4092}`,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'lottie-react',
    ],
  },
});
