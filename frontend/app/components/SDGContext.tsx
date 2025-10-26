// frontend/components/SDGContext.tsx
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

interface SDGContextType {
  file: File | null;
  setFile: (file: File | null) => void;
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  sector: string;
  setSector: (sector: string) => void;
  selectedSector: string;
  setSelectedSector: (selectedSector: string) => void;
  reset: () => void;
}

export const SDGContext = createContext<SDGContextType | null>(null);

export const SDGProvider = ({ children }: { children: ReactNode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sector, setSector] = useState<string>("General");
  const [selectedSector, setSelectedSector] = useState<string>(""); // Empty for "All Sectors"

  const reset = () => {
    setFile(null);
    setQuestions([]);
    setSector("General");
    setSelectedSector("");
  };

  return (
    <SDGContext.Provider
      value={{
        file,
        setFile,
        questions,
        setQuestions,
        sector,
        setSector,
        selectedSector,
        setSelectedSector,
        reset,
      }}
    >
      {children}
    </SDGContext.Provider>
  );
};