"use client";

import React from "react";
import { SheetProvider } from "./SheetContext";
import { SDGProvider } from "./SDGContext";

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SheetProvider>
      <SDGProvider>
        {children}
      </SDGProvider>
    </SheetProvider>
  );
};

export default Providers;