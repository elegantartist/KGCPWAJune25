import React, { createContext, useContext, useState, ReactNode } from "react";

// Define the shape of our context
export interface SidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

// Create context with undefined as default value
export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

// Provider component that wraps the app
export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Function to toggle the sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Values to be provided to consuming components
  const value: SidebarContextType = {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

// Custom hook for accessing the sidebar context
export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};