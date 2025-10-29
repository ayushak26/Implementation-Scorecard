// app/components/SectorPicker.tsx
"use client";

import React, { useMemo, useState, useContext } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const ctx = useContext(SDGContext);
  if (!ctx) return null;

  const { setSelectedSector } = ctx;
  const sectors = SECTOR_ORDER;
  const [picked, setPicked] = useState<string>("");

  const toggle = (sec: string) => {
    const s = canonicalSector(sec);
    setPicked((prev) => (prev === s ? "" : s));
  };

  const start = () => {
    if (!picked) return;
    setSelectedSector(picked);
    router.push("/form");
  };

  const canStart = !!picked;

  return (
    // Full-bleed wrapper that centers on the page
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-neutral-50">
      {/* 500x500 on large screens, but still shrinks on small screens */}
      <div className="w-[500px] h-[500px] max-w-full rounded-2xl shadow-lg bg-white p-6 flex flex-col">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-2">Choose Sector</h2>
          <p className="text-neutral text-sm mb-6">
            Select <strong>one</strong> sector to begin the questionnaire.
          </p>
        </div>
        <div className="flex-3 overflow-auto">
        <div className="flex flex-col gap-7 items-center mt-10">
            {sectors.map((sec) => {
              const isActive = picked === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => toggle(sec)}
                  aria-pressed={isActive}
                  className={`w-full max-w-xs px-7 py-3 rounded-xl font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            ${isActive
                      ? "bg-gray-800 text-white ring-2 ring-gray-800"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  {sec}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={start}
            disabled={!canStart}
            className="w-full px-6 py-3 rounded-xl text-white font-semibold bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            Start Questionnaire
          </button>
        </div>
      </div>
    </div>
  );
}