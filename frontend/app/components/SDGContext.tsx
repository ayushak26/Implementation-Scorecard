// app/components/SDGContext.tsx
"use client";

import React, { createContext, useState, ReactNode } from "react";

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
  const [selectedSector, setSelectedSector] = useState<string>("Textiles");
  const [file, setFile] = useState<File | null>(null);

  /**
   * reset() - Clears ONLY scorecard results, NOT uploaded questions
   * Use this when user wants to retake the assessment with same questions
   */
  const reset = () => {
    console.log("🔄 Resetting scorecard results (keeping uploaded Excel)...");
    
    // Clear only scorecard results from sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("scorecard");
      sessionStorage.removeItem("scorecardSector");
      
      // Check if uploaded questions exist
      const hasUploadedQuestions = localStorage.getItem("uploadedQuestions");
      if (hasUploadedQuestions) {
        console.log("✅ Uploaded Excel preserved in localStorage");
      }
    }
    
    // Reset context state
    setSector("Textiles");
    setSelectedSector("Textiles");
    setFile(null);
    
    // DON'T clear questions - they will reload from localStorage
    // setQuestions([]); ← DO NOT DO THIS
    
    console.log("✅ Reset complete - uploaded questions preserved");
  };

  /**
   * clearAll() - Clears EVERYTHING including uploaded Excel
   * Use this when user wants to start completely fresh
   */
  const clearAll = () => {
    console.log("🗑️ Clearing ALL data including uploaded Excel...");
    
    if (typeof window !== "undefined") {
      // Clear scorecard results
      sessionStorage.removeItem("scorecard");
      sessionStorage.removeItem("scorecardSector");
      
      // Clear uploaded Excel data
      localStorage.removeItem("uploadedQuestions");
      localStorage.removeItem("uploadedSector");
      localStorage.removeItem("uploadedTimestamp");
      localStorage.removeItem("uploadedFilename");
      
      console.log("✅ All data cleared from storage");
    }
    
    // Reset all context state
    setQuestions([]);
    setSector("Textiles");
    setSelectedSector("Textiles");
    setFile(null);
    
    console.log("✅ Complete reset - will use default Excel on next load");
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