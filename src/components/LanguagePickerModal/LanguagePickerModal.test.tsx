import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import * as authContext from '@/context/AuthContext';
import { LanguagePickerModal } from './LanguagePickerModal';

vi.mock('@/context/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
  };
});

describe('LanguagePickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authContext.useAuth).mockReturnValue({
      currentUser: { uid: 'user_1' },
    } as ReturnType<typeof authContext.useAuth>);
    vi.mocked(firestore.getDoc).mockResolvedValue({
      data: () => ({}),
    } as Awaited<ReturnType<typeof firestore.getDoc>>);
    vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('save failed'));
  });

  const renderModal = (startGameOnConfirm: boolean) => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <LanguagePickerModal
            opened
            onClose={onClose}
            onConfirm={onConfirm}
            startGameOnConfirm={startGameOnConfirm}
          />
        </MantineProvider>
      </QueryClientProvider>
    );
    return { onConfirm, onClose };
  };

  it('shows a save error and keeps settings open for a retry', async () => {
    const { onConfirm, onClose } = renderModal(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Save Languages' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save language preferences. Please try again.'
    );
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('starts the selected game even when saving preferences fails', async () => {
    const { onConfirm, onClose } = renderModal(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Start Game' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(['en', 'es', 'fr'], false));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
