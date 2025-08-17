import { createContext, FC, ReactNode, useContext, useMemo, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';

interface SidebarContextType {
  // Existing properties
  sidebarContent: ReactNode | null;
  setSidebarContent: (content: ReactNode | null) => void;

  // New disclosure properties
  opened: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarContent, setSidebarContent] = useState<ReactNode | null>(null);
  // 1. Call the useDisclosure hook here
  const [opened, { open, close, toggle }] = useDisclosure();

  // 2. Add the new state and functions to the context value
  const value = useMemo(
    () => ({
      sidebarContent,
      setSidebarContent,
      opened,
      open,
      close,
      toggle,
    }),
    [sidebarContent, opened, open, close, toggle]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
