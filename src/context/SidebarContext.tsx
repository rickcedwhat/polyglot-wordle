import { createContext, FC, ReactNode, useContext, useMemo, useState } from 'react';

interface SidebarContextType {
  sidebarContent: ReactNode | null;
  setSidebarContent: (content: ReactNode | null) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarContent, setSidebarContent] = useState<ReactNode | null>(null);

  const value = useMemo(() => ({ sidebarContent, setSidebarContent }), [sidebarContent]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
