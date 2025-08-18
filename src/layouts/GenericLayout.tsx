import { FC } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { AppShell, Avatar, Group, Text, Title } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import classes from './GenericLayout.module.css';

export const GenericLayout: FC = () => {
  const { currentUser } = useAuth();
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Link to="/" className={classes.link}>
            <Title className={classes.title}>
              Polyglot{' '}
              <Text span c="blue" inherit>
                Wordle
              </Text>
            </Title>
          </Link>

          {currentUser && (
            <Link to={`/profile/${currentUser.uid}`}>
              <Avatar
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'Profile'}
                radius="xl"
              />
            </Link>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main display="flex">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
