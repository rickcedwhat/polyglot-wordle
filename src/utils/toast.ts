import { notifications, type NotificationData } from '@mantine/notifications';

/** Lets the guess's tiles mostly flip before the first toast appears. */
const FIRST_TOAST_DELAY_MS = 1000;
const TOAST_GAP_MS = 500;
let nextToastAt = 0;

/**
 * Shows a toast in the shared stack (bottom-right on desktop, bottom-center on mobile).
 * Toasts appear one after another rather than all at once.
 */
export const showToast = (data: NotificationData) => {
  const now = Date.now();
  const showAt = Math.max(now + FIRST_TOAST_DELAY_MS, nextToastAt + TOAST_GAP_MS);
  nextToastAt = showAt;
  setTimeout(() => {
    const isMobile = window.matchMedia('(max-width: 48em)').matches;
    notifications.show({
      autoClose: 6000,
      position: isMobile ? 'bottom-center' : 'bottom-right',
      ...data,
    });
  }, showAt - now);
};
