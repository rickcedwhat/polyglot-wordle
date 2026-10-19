import { Center, Loader } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import { GenericLayout } from './GenericLayout';
import { SidebarLayout } from './SidebarLayout';

/** Wait for auth before choosing the landing page or the signed-in app shell. */
export const HomeLayout = () => {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <Center h="100dvh">
        <Loader />
      </Center>
    );
  }
  return currentUser ? <SidebarLayout /> : <GenericLayout />;
};
