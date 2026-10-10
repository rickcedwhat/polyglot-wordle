import { useEffect, useState } from 'react';

/** How long the spinner shows before offering a retry. */
export const SLOW_LOAD_MS = 12_000;

/** True once `active` has lasted SLOW_LOAD_MS; `restart` starts the wait over. */
export const useSlow = (active: boolean) => {
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setSlow(false);
    if (!active) {
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [active, attempt]);
  return { slow, restart: () => setAttempt((n) => n + 1) };
};
