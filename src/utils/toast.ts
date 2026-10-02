import { notifications, type NotificationData } from '@mantine/notifications';

/** Lets the guess's tiles mostly flip before the first toast appears. */
const FIRST_TOAST_DELAY_MS = 1000;
const TOAST_GAP_MS = 500;
let nextToastAt = 0;
const pendingToasts = new Set<ReturnType<typeof setTimeout>>();

export const clearPendingToasts = () => {
  pendingToasts.forEach((timeout) => clearTimeout(timeout));
  pendingToasts.clear();
  nextToastAt = 0;
};

const show = (data: NotificationData) => {
  const isMobile = window.matchMedia('(max-width: 48em)').matches;
  notifications.show({
    autoClose: 6000,
    position: isMobile ? 'bottom-center' : 'bottom-right',
    ...data,
  });
};

/**
 * Shows a toast in the shared stack (bottom-right on desktop, bottom-center on mobile).
 * Toasts appear one after another rather than all at once; `immediate` skips the queue
 * for direct responses to the player (e.g. a prompt).
 */
export const showToast = (data: NotificationData, { immediate = false } = {}) => {
  if (immediate) {
    show(data);
    return;
  }
  const now = Date.now();
  const showAt = Math.max(now + FIRST_TOAST_DELAY_MS, nextToastAt + TOAST_GAP_MS);
  nextToastAt = showAt;
  const timeout = setTimeout(() => {
    pendingToasts.delete(timeout);
    show(data);
  }, showAt - now);
  pendingToasts.add(timeout);
};
