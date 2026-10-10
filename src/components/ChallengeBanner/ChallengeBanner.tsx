import { FC, ReactNode, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Badge, CloseButton, Group, Paper, Text } from '@mantine/core';
import { UserAvatar } from '@/components/UserAvatar/UserAvatar';
import { MAX_GUESSES } from '@/config';
import type { ChallengerProfile } from '@/hooks/useChallenge';
import type { GameDoc } from '@/types/firestore';
import { ProfileLink } from '../ProfileLink/ProfileLink';

interface ChallengeBannerProps {
  challengerUser: ChallengerProfile | null;
  challengerGame: GameDoc;
}

/** The challenger's name in the banner text; translations place it with `<name>`. */
const NameLink: FC<{ userId: string; children?: ReactNode }> = ({ userId, children }) => (
  <ProfileLink userId={userId}>
    <Text span fw={700}>
      {children}
    </Text>
  </ProfileLink>
);

export const ChallengeBanner: FC<ChallengeBannerProps> = ({ challengerUser, challengerGame }) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const name = challengerUser?.displayName || t('game.challenge.aFriend');
  const nameLink = <NameLink userId={challengerGame.userId} />;
  const turns = challengerGame.guessHistory.length;
  const score = challengerGame.score ?? 0;
  const challengerFinished = !!challengerGame.completedAt;

  return (
    <Paper
      p="xs"
      radius="md"
      withBorder
      style={{
        background:
          'linear-gradient(135deg, rgba(34, 139, 230, 0.15) 0%, rgba(18, 184, 134, 0.15) 100%)',
        borderColor: 'rgba(34, 139, 230, 0.4)',
        maxWidth: 600,
        margin: '0 auto 12px auto',
        width: '100%',
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <ProfileLink
            userId={challengerGame.userId}
            aria-label={t('game.challenge.viewProfile', { name })}
          >
            <UserAvatar src={challengerUser?.photoURL} name={name} size="sm" />
          </ProfileLink>
          <div>
            <Group gap={6} align="center">
              <Text size="xs" fw={700} c="blue.3">
                {t('game.challenge.mode')}
              </Text>
              {challengerFinished && (
                <Badge size="xs" variant="filled" color="yellow">
                  {t('game.challenge.points', { score })}
                </Badge>
              )}
            </Group>
            <Text size="xs" c="gray.2">
              {challengerFinished ? (
                <Trans
                  i18nKey="game.challenge.canYouBeat"
                  values={{ name, turns, max: MAX_GUESSES }}
                  components={{ name: nameLink }}
                />
              ) : (
                <Trans
                  i18nKey="game.challenge.notFinished"
                  values={{ name }}
                  components={{ name: nameLink }}
                />
              )}
            </Text>
          </div>
        </Group>

        <CloseButton
          size="xs"
          onClick={() => setDismissed(true)}
          aria-label={t('game.challenge.dismiss')}
        />
      </Group>
    </Paper>
  );
};
