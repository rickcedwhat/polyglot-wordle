import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { UserAvatar } from './UserAvatar';

const renderAvatar = (props: Parameters<typeof UserAvatar>[0]) =>
  render(
    <MantineProvider>
      <UserAvatar {...props} />
    </MantineProvider>
  );

describe('UserAvatar', () => {
  it('loads the photo without a referrer', () => {
    renderAvatar({ src: 'https://lh3.googleusercontent.com/a/photo', name: 'Thiery Catalan' });
    expect(screen.getByRole('img')).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('falls back to initials when the photo fails', () => {
    renderAvatar({ src: 'https://example.com/broken.png', name: 'Thiery Catalan' });
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('TC')).toBeInTheDocument();
  });

  it('shows initials when there is no photo', () => {
    renderAvatar({ src: '', name: 'Alex Rivera' });
    expect(screen.getByText('AR')).toBeInTheDocument();
  });
});
