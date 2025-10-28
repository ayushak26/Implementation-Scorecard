"use client";

import React, { createContext, useState, ReactNode } from 'react';

interface SheetContextProps {
  sheetNames: string[];
  setSheetNames: (names: string[]) => void;
  selectedSheet: string | null;
  setSelectedSheet: (sheet: string | null) => void;
}

const SheetContext = createContext<SheetContextProps>({
  sheetNames: [],
  setSheetNames: () => {},
  selectedSheet: null,
  setSelectedSheet: () => {},
});

const SheetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  return (
    <SheetContext.Provider value={{ sheetNames, setSheetNames, selectedSheet, setSelectedSheet }}>
      {children}
    </SheetContext.Provider>
  );
};

export { SheetContext, SheetProvider };