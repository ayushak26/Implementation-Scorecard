// app/components/SectorPicker.tsx
"use client";

import React, { useMemo, useState, useContext } from "react";
import { useRouter } from "next/navigation"; // Import router
import { SDGContext } from "./SDGContext";

const SECTOR_ORDER = ["Textiles", "Fertilizers", "Packaging"] as const;
const norm = (s: string) => (s || "").trim().toLowerCase();

const canonicalSector = (s?: string): string => {
  const m: Record<string, string> = {
    textile: "Textiles",
    textiles: "Textiles",
    fertilizer: "Fertilizers",
    fertilizers: "Fertilizers",
    packaging: "Packaging",
  };
  const k = norm(s || "");
  return m[k] || (s?.trim() || "General");
};

export default function SectorPicker() {
  const router = useRouter(); // Initialize router
  const ctx = useContext(SDGContext);
  if (!ctx) return null;

  const { setSelectedSector } = ctx;

  // Only show the three canonical sectors
  const sectors = SECTOR_ORDER;

  // Single selected sector
  const [picked, setPicked] = useState<string>("");

  const toggle = (sec: string) => {
    const s = canonicalSector(sec);
    setPicked((prev) => (prev === s ? "" : s));
  };

  const start = () => {
    if (!picked) return;
    setSelectedSector(picked);
    router.push("/form"); // Navigate to the form page
  };

  const canStart = !!picked;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-primary mb-2">Choose Sector</h2>
      <p className="text-neutral text-sm mb-6">
        Select <strong>one</strong> sector to begin the questionnaire.
      </p>

      <div className="flex flex-wrap gap-3 mb-8 justify-center">
        {sectors.map((sec) => {
          const isActive = picked === sec;
          return (
            <button
              key={sec}
              onClick={() => toggle(sec)}
              className={`px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200
          ${isActive
                  ? "bg-gray-800 text-white ring-2 ring-gray-800 ring-offset-2 shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                }`}
            >
              {sec}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={start}
          disabled={!canStart}
          className={`w-full max-w-xs px-6 py-3 rounded-xl text-white font-semibold ${canStart
              ? "bg-gray-900"
              : "bg-gray-900 text-gray-700 cursor-not-allowed"
            }`}
        >
          Start Questionnaire
        </button>

        {picked && (
          <p className="text-sm text-neutral">
            Selected: <strong className="text-primary">{picked}</strong>
          </p>
        )}
      </div>
    </div>
  );
}