import { ReactNode, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from 'firebase/auth';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';

const STORY_USER = { uid: 'me', displayName: 'You', photoURL: null } as unknown as User;

/** Signed-in story user, a router, and React Query defaults that never hit Firestore. */
export const MockAuth = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  useState(() => {
    queryClient.setDefaultOptions({ queries: { staleTime: Infinity, retry: false } });
  });
  return (
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          currentUser: STORY_USER,
          loading: false,
          signInWithGoogle: () => {},
          logout: () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    </MemoryRouter>
  );
};
