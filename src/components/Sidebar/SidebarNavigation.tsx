import { useState, type ReactNode } from 'react';
import {
  IconActivity,
  IconAdjustmentsHorizontal,
  IconChevronRight,
  IconFlag,
  IconHelpCircle,
  IconHome,
  IconLanguage,
  IconLogout,
  IconPlus,
  IconSettings,
  IconSwords,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Divider,
  Group,
  NavLink,
  Paper,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { BlurButton as Button } from '@/components/BlurButton/BlurButton';
import { HELP_TOPICS, type HelpTopic } from '@/components/HowToPlayModal/HelpSlides';
import { UserAvatar } from '@/components/UserAvatar/UserAvatar';
import classes from './SidebarNavigation.module.css';

/** Shared sidebar view for the app and its interactive Storybook previews. */
export const SidebarNavigation = ({
  currentPath,
  user,
  unreadCount = 0,
  activityUnreadCount = 0,
  settingsExpanded = false,
  helpExpanded = false,
  activeHelpTopic,
  onNavigate,
  onNewGame,
  onHelpTopic,
  onSetup,
  onFlags,
  onLanguage,
  onLogout,
  onSandbox,
  children,
}: {
  currentPath: string;
  user: { uid: string; displayName?: string | null; photoURL?: string | null };
  unreadCount?: number;
  activityUnreadCount?: number;
  settingsExpanded?: boolean;
  helpExpanded?: boolean;
  activeHelpTopic?: HelpTopic;
  onNavigate: () => void;
  onNewGame: () => void;
  onHelpTopic: (topic: HelpTopic) => void;
  onSetup: () => void;
  onFlags: () => void;
  onLanguage: () => void;
  onLogout: () => void;
  onSandbox?: () => void;
  children?: ReactNode;
}) => {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(helpExpanded);
  const [settingsOpen, setSettingsOpen] = useState(settingsExpanded);
  const links = [
    { id: '/', label: t('nav.home'), icon: IconHome },
    { id: '/feed', label: t('feed.title'), icon: IconActivity, count: activityUnreadCount },
    { id: '/challenges', label: t('nav.challenges'), icon: IconSwords, count: unreadCount },
  ];
  return (
    <Paper
      component="nav"
      aria-label={t('nav.mainNavigation')}
      className={classes.sidebar}
      withBorder
      radius="md"
    >
      <Group gap={10} px="sm" mb={28}>
        <Box className={classes.mark}>
          p<span>·</span>
        </Box>
        <div>
          <Text fw={750} size="sm" lh={1.2}>
            Polyglot
          </Text>
          <Text size="xs" c="dimmed" lh={1.4}>
            Wordle
          </Text>
        </div>
      </Group>
      <Stack gap={4}>
        {links.map(({ id, label, icon: Icon, count }) => (
          <NavLink
            key={id}
            component={Link}
            to={id}
            className={classes.navItem}
            active={currentPath === id}
            aria-current={currentPath === id ? 'page' : undefined}
            label={label}
            leftSection={<Icon size={19} stroke={1.65} />}
            rightSection={
              count ? (
                <Badge size="sm" variant="light" circle>
                  {count}
                </Badge>
              ) : undefined
            }
            onClick={onNavigate}
          />
        ))}
      </Stack>
      <Button
        mt="lg"
        mx="sm"
        variant="light"
        leftSection={<IconPlus size={18} />}
        justify="flex-start"
        radius="md"
        onClick={onNewGame}
      >
        {t('nav.newGame')}
      </Button>
      <Box className={classes.utilities}>
        <NavLink
          component="button"
          className={classes.navItem}
          label={t('nav.howToPlay')}
          leftSection={<IconHelpCircle size={19} stroke={1.65} />}
          opened={helpOpen}
          onChange={setHelpOpen}
          childrenOffset={28}
        >
          {HELP_TOPICS.map(({ value }) => (
            <NavLink
              key={value}
              component="button"
              className={classes.subItem}
              label={t(`help.topics.${value}`)}
              active={activeHelpTopic === value}
              onClick={() => onHelpTopic(value)}
            />
          ))}
        </NavLink>
        <NavLink
          component="button"
          className={classes.navItem}
          label={t('nav.settings')}
          leftSection={<IconSettings size={19} stroke={1.65} />}
          opened={settingsOpen}
          onChange={setSettingsOpen}
          childrenOffset={28}
        >
          {[
            {
              id: 'setup',
              label: t('nav.gameSetup'),
              icon: IconAdjustmentsHorizontal,
              action: onSetup,
            },
            { id: 'flags', label: t('nav.flags'), icon: IconFlag, action: onFlags },
            { id: 'language', label: t('uiLanguage.menu'), icon: IconLanguage, action: onLanguage },
          ].map(({ id, label, icon: Icon, action }) => (
            <NavLink
              key={id}
              component="button"
              className={classes.subItem}
              label={label}
              leftSection={<Icon size={16} stroke={1.65} />}
              onClick={action}
            />
          ))}
        </NavLink>
        {onSandbox && (
          <NavLink
            component="button"
            className={classes.navItem}
            label={t('nav.sandbox')}
            leftSection={<IconAdjustmentsHorizontal size={19} />}
            onClick={onSandbox}
          />
        )}
      </Box>
      {children}
      <Divider my="md" />
      <Group gap="xs" px="sm" wrap="nowrap">
        <UnstyledButton
          className={classes.account}
          component={Link}
          to={`/profile/${user.uid}`}
          onClick={onNavigate}
          aria-current={currentPath === `/profile/${user.uid}` ? 'page' : undefined}
          aria-label={t('nav.profile')}
        >
          <Group gap={10} wrap="nowrap">
            <UserAvatar name={user.displayName} src={user.photoURL} size={34} />
            <div className={classes.accountText}>
              <Text size="sm" fw={600} truncate>
                {user.displayName || t('nav.profile')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('nav.profile')}
              </Text>
            </div>
            <IconChevronRight size={14} className={classes.accountArrow} />
          </Group>
        </UnstyledButton>
        <Tooltip label={t('nav.logout')}>
          <ActionIcon variant="subtle" color="gray" aria-label={t('nav.logout')} onClick={onLogout}>
            <IconLogout size={18} stroke={1.65} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
};
