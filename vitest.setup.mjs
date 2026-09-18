// vitest.setup.mjs
import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

// Provide stubbed Firebase config values for headless test environments / CI
process.env.VITE_FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'fake-api-key-for-tests';
process.env.VITE_FIREBASE_AUTH_DOMAIN =
  process.env.VITE_FIREBASE_AUTH_DOMAIN || 'polyglot-wordle.firebaseapp.com';
process.env.VITE_FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'polyglot-wordle';
process.env.VITE_FIREBASE_STORAGE_BUCKET =
  process.env.VITE_FIREBASE_STORAGE_BUCKET || 'polyglot-wordle.firebasestorage.app';
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID =
  process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890';
process.env.VITE_FIREBASE_APP_ID =
  process.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456';

// Also mock Firebase Auth and Firestore in testing environments if imported
vi.mock('@/firebase', () => ({
  auth: { currentUser: null, onAuthStateChanged: vi.fn() },
  googleProvider: {},
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn(),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
    setDoc: vi.fn().mockResolvedValue(undefined),
    runTransaction: vi.fn(async (_db, updateFn) => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      return updateFn(mockTransaction);
    }),
  };
});

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
