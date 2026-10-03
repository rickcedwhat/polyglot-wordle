import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Anchor } from '@mantine/core';

interface ProfileLinkProps {
  /** Renders the children unlinked while the id is unknown. */
  userId?: string | null;
  'aria-label'?: string;
  children: ReactNode;
}

/** Links a player's name or avatar to their profile without triggering the surrounding row's action. */
export const ProfileLink: FC<ProfileLinkProps> = ({ userId, children, 'aria-label': ariaLabel }) =>
  userId ? (
    <Anchor
      component={Link}
      to={`/profile/${userId}`}
      aria-label={ariaLabel}
      c="inherit"
      underline="hover"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Anchor>
  ) : (
    <>{children}</>
  );
