import { act, renderHook } from '@testing-library/react';
import { signOut } from 'firebase/auth';
import { afterEach, expect, it, vi } from 'vitest';
import { notifications } from '@mantine/notifications';
import { auth } from '@/firebase';
import { clearPendingToasts, showToast } from '@/utils/toast';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('@/firebase', () => ({ auth: {}, googleProvider: {} }));
vi.mock('firebase/auth', () => ({
  getRedirectResult: vi.fn().mockResolvedValue(null),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
  signOut: vi.fn(),
}));

afterEach(() => {
  clearPendingToasts();
  vi.useRealTimers();
  vi.clearAllMocks();
});

it('cancels queued toasts before signing out', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
  showToast({ message: 'Queued first' });
  showToast({ message: 'Queued second' });
  vi.mocked(signOut).mockImplementation(() => {
    expect(vi.getTimerCount()).toBe(0);
    vi.runAllTimers();
    expect(notifications.show).not.toHaveBeenCalled();
    return Promise.resolve();
  });

  act(() => result.current.logout());

  expect(signOut).toHaveBeenCalledExactlyOnceWith(auth);
});
