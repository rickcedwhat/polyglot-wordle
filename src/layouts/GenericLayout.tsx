import { FC } from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell, Center, Text, Title } from '@mantine/core';
import classes from './GenericLayout.module.css';

export const GenericLayout: FC = () => {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Center h="100%">
          <Title className={classes.title}>
            Polyglot{' '}
            <Text span c="blue" inherit>
              Wordle
            </Text>
          </Title>
        </Center>
      </AppShell.Header>

      <AppShell.Main display="flex">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
