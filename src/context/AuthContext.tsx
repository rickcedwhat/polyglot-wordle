import { createContext, FC, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
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

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error during Google popup sign-in:', error);
    }
  };

  const logout = () => {
    signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // "Get or Create" the user document in Firestore
        const db = getFirestore();
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            displayName: user.displayName || 'New Player',
            email: user.email || '',
            photoURL: user.photoURL || '',
            joinedAt: serverTimestamp(),
            stats: { gamesPlayed: 0, wins: 0, currentStreak: 0, maxStreak: 0 },
            difficultyPrefs: {
              en: 'advanced',
              es: 'basic',
              fr: 'basic',
            },
          });
        }
      }
      setCurrentUser(user);
      setLoading(false);
    });

    // The listener stays active and unsubscribes only when the component unmounts
    return unsubscribe;
  }, []);

  // 2. Memoize the context value
  const value = useMemo(
    () => ({
      currentUser,
      loading,
      signInWithGoogle,
      logout,
    }),
    [currentUser, loading] // The value only changes if currentUser or loading changes
  );

  // Prevent the rest of the app from rendering until the initial auth check is complete
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
