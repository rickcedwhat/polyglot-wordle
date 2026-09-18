// vitest.setup.mjs
import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

const { getComputedStyle } = window;
window.getComputedStyle = (elt) => getComputedStyle(elt);
window.HTMLElement.prototype.scrollIntoView = () => {};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// Node 26 jsdom localStorage fallback
if (!globalThis.localStorage || typeof globalThis.localStorage.clear !== 'function') {
  const createStorage = () => {
    let store = {};
    return {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, val) => {
        store[key] = String(val);
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      key: vi.fn((idx) => Object.keys(store)[idx] || null),
      get length() {
        return Object.keys(store).length;
      },
    };
  };

  const storageMock = createStorage();
  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageMock,
    writable: true,
    configurable: true,
  });
}
