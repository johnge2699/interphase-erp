import React, { createContext, useContext, useState, useEffect } from "react";

interface AppStateContextType {
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  selectedWeekNumber: number;
  setSelectedWeekNumber: (week: number) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // Load initial state from localStorage if available
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    const saved = localStorage.getItem("interphase_selected_project");
    return saved ? parseInt(saved, 10) : null;
  });

  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(() => {
    const saved = localStorage.getItem("interphase_selected_week");
    // Default to current week of year if not saved
    if (saved) return parseInt(saved, 10);
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  });

  useEffect(() => {
    if (selectedProjectId !== null) {
      localStorage.setItem("interphase_selected_project", selectedProjectId.toString());
    } else {
      localStorage.removeItem("interphase_selected_project");
    }
  }, [selectedProjectId]);

  useEffect(() => {
    localStorage.setItem("interphase_selected_week", selectedWeekNumber.toString());
  }, [selectedWeekNumber]);

  return (
    <AppStateContext.Provider
      value={{
        selectedProjectId,
        setSelectedProjectId,
        selectedWeekNumber,
        setSelectedWeekNumber,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}
