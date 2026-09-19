import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const getAuthDomain = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('web.app')) {
    return window.location.hostname;
  }
  return import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'polyglot-wordle.web.app';
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA7EDV4FNTX6XCbPagpQzgint4KaFpM4hc',
  authDomain: getAuthDomain(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'polyglot-wordle',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'polyglot-wordle.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '402617980636',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:402617980636:web:c4be7fa58d3b7cfab58619',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and export it
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
