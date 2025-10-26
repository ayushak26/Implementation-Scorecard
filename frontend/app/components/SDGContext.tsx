// frontend/components/SDGContext.tsx
"use client";
import React, { createContext, useState, ReactNode } from "react";

type QuestionnaireRow = {
  sdg_number: number | null;
  sdg_description?: string | null;
  sdg_target?: string | null;
  sustainability_dimension?: string | null;
  kpi?: string | null;
  question?: string | null;
  sector?: string | null;
  score?: number | null;
  score_description?: string | null;
  source?: string | null;
  notes?: string | null;
  status?: string | null;
  comment?: string | null;
};

type SectorRows = { rows: QuestionnaireRow[] };
type SectorData = Record<string, SectorRows>;

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
  file: File | null;
  setFile: (file: File | null) => void;
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  sector: string;
  setSector: (sector: string) => void;
  responses: Record<string, number>;
  setResponses: React.Dispatch<React.SetStateAction<Record<string, number>>>; // Updated typing
  data: SectorData | null;
  setData: (data: SectorData | null) => void;
  reset: () => void;
};

export const SDGContext = createContext<SDGContextType | undefined>(undefined);

export const SDGProvider = ({ children }: { children: ReactNode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sector, setSector] = useState<string>("");
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [data, setData] = useState<SectorData | null>(null);

  const reset = () => {
    setFile(null);
    setQuestions([]);
    setSector("");
    setResponses({});
    setData(null);
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
        responses,
        setResponses,
        data,
        setData,
        reset,
      }}
    >
      {children}
    </SDGContext.Provider>
  );
};