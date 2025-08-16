import { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom'; // 1. Import useLocation
import { Center, Loader } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';

export const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation(); // 2. Get the user's current location

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader />
      </Center>
    );
  }

  if (!currentUser) {
    // 3. Pass the current location in the `state` prop when navigating to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
