import React from 'react';
import { ThemeProvider } from '@scaffold/ui';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultMode="dark" storageKey="dict-console-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
