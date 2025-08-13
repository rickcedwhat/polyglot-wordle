import { createContext, FC, ReactNode, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup, // 1. Change the import from signInWithRedirect
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 2. Make this function async and use signInWithPopup
  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // After the popup closes and the user is signed in,
      // onAuthStateChanged will fire automatically and handle the rest.
    } catch (error) {
      console.error('Error during Google popup sign-in:', error);
    }
  };

  const logout = () => {
    signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
