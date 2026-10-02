import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifications } from '@mantine/notifications';
import { clearPendingToasts, showToast } from './toast';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

describe('toast scheduling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearPendingToasts();
    vi.useRealTimers();
  });

  it('preserves the initial delay and spacing between toasts', () => {
    showToast({ message: 'First' });
    showToast({ message: 'Second' });
    vi.advanceTimersByTime(999);
    expect(notifications.show).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: 'First' })
    );
    vi.advanceTimersByTime(499);
    expect(notifications.show).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(notifications.show).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ message: 'Second' })
    );
  });

  it('cancels all pending toasts and restarts scheduling with the initial delay', () => {
    showToast({ message: 'Old first' });
    showToast({ message: 'Old second' });
    clearPendingToasts();
    expect(vi.getTimerCount()).toBe(0);
    clearPendingToasts();
    showToast({ message: 'New' });
    vi.advanceTimersByTime(999);
    expect(notifications.show).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: 'New' })
    );
    vi.runAllTimers();
    expect(notifications.show).toHaveBeenCalledTimes(1);
  });
});
