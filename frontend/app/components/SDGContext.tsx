// app/components/SDGContext.tsx
"use client";

import React, { createContext, useState, ReactNode, useEffect } from "react";

type Question = {
  id: string;
  sdg_number: number;
  sdg_description: string;
  sdg_target: string;
  sustainability_dimension: string;
  kpi: string;
  question: string;
  sector: string;
};

type SDGContextType = {
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  sector: string;
  setSector: (sector: string) => void;
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  reset: () => void;
  clearAll: () => void;
};

export const SDGContext = createContext<SDGContextType | null>(null);

export function SDGProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sector, setSector] = useState<string>("Textiles");
  const [selectedSector, setSelectedSector] = useState<string>(""); // Start empty
  const [file, setFile] = useState<File | null>(null);

  // Load selected sector from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("selectedSector");
      if (saved) {
        console.log("📂 Restored selected sector from session:", saved);
        setSelectedSector(saved);
      }
    }
  }, []);

  // Save selected sector to sessionStorage when it changes
  useEffect(() => {
    if (selectedSector && typeof window !== "undefined") {
      sessionStorage.setItem("selectedSector", selectedSector);
      console.log("💾 Saved selected sector to session:", selectedSector);
    }
  }, [selectedSector]);

  const reset = () => {
    console.log("🔄 Resetting (keeping uploaded Excel)...");
    
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("scorecard");
      sessionStorage.removeItem("scorecardSector");
      sessionStorage.removeItem("selectedSector"); // Clear sector selection
    }
    
    setSector("Textiles");
    setSelectedSector(""); // Reset to empty
    setFile(null);
    
    console.log("✅ Reset complete");
  };

  const clearAll = () => {
    console.log("🗑️ Clearing all data...");
    
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      localStorage.removeItem("uploadedQuestions");
      localStorage.removeItem("uploadedSector");
      localStorage.removeItem("uploadedTimestamp");
      localStorage.removeItem("uploadedFilename");
    }
    
    setQuestions([]);
    setSector("Textiles");
    setSelectedSector("");
    setFile(null);
    
    console.log("✅ All data cleared");
  };

  return (
    <SDGContext.Provider
      value={{
        questions,
        setQuestions,
        sector,
        setSector,
        selectedSector,
        setSelectedSector,
        file,
        setFile,
        reset,
        clearAll,
      }}
    >
      {children}
    </SDGContext.Provider>
  );
}