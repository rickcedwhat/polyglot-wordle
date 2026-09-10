import { useEffect, useState } from 'react';

type Listener = () => void;
const listeners = new Set<Listener>();

export const openSandboxDrawer = () => {
  listeners.forEach((fn) => fn());
};

export const useSandboxDrawer = () => {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpened(true);
    listeners.add(handleOpen);
    return () => {
      listeners.delete(handleOpen);
    };
  }, []);

  return {
    opened,
    open: () => setOpened(true),
    close: () => setOpened(false),
  };
};
