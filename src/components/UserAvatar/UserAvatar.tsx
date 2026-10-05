import { FC } from 'react';
import { Avatar, type AvatarProps } from '@mantine/core';

interface UserAvatarProps extends Omit<AvatarProps, 'src' | 'name' | 'alt'> {
  src?: string | null;
  /** Shown as initials, with a stable color per name, when there's no photo or it fails to load. */
  name?: string | null;
}

/**
 * A player's profile photo. Google-hosted photos often fail when the request carries a referrer,
 * so the image is loaded without one.
 */
export const UserAvatar: FC<UserAvatarProps> = ({ src, name, radius = 'xl', ...rest }) => (
  <Avatar
    src={src || null}
    name={name || undefined}
    alt={name || undefined}
    color="initials"
    radius={radius}
    imageProps={{ referrerPolicy: 'no-referrer' }}
    {...rest}
  />
);
