"use client";

import React, { useMemo, useState, useContext } from "react";
import { SDGContext } from "./SDGContext";

const SECTOR_ORDER = ["Textiles", "Fertilizers", "Packaging"] as const;
const norm = (s: string) => (s || "").trim().toLowerCase();

function canonicalSector(s?: string): string {
  const m: Record<string, string> = {
    "textile": "Textiles",
    "textiles": "Textiles",
    "fertilizer": "Fertilizers",
    "fertilizers": "Fertilizers",
    "packaging": "Packaging",
  };
  const k = norm(s || "");
  return m[k] || (s?.trim() || "General");
}

export default function SectorPicker() {
  const ctx = useContext(SDGContext);
  if (!ctx) return null;

  const { questions, setSelectedSector } = ctx;

  // Build chips: All Sectors + discovered + enforce canonical order up front
  const sectors = useMemo(() => {
    const discovered = new Set<string>();
    questions.forEach((q) => q.sector && discovered.add(canonicalSector(q.sector)));
    const ordered = Array.from(new Set<string>([...SECTOR_ORDER, ...Array.from(discovered)]));
    return ordered;
  }, [questions]);

  // Local selection (max 2)
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (sec: string) => {
    const s = canonicalSector(sec);
    setPicked((prev) => {
      let next = prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s];
      if (next.length > 2) next = next.slice(-2); // keep most recent two
      return next;
    });
  };

  const start = () => {
    // Store selection into context.selectedSector for compatibility with FormPage:
    // - If none picked => "All Sectors" (your FormPage already handles it)
    // - If one picked  => that sector
    // - If two picked  => "Multiple" (FormPage uses internal array state if you extended it)
    if (picked.length === 0) setSelectedSector("All Sectors");
    else if (picked.length === 1) setSelectedSector(picked[0]);
    else setSelectedSector("Multiple");
  };

  const canStart = picked.length === 0 || picked.length === 1 || picked.length === 2;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-primary mb-2">Choose Sector(s)</h2>
      <p className="text-neutral text-sm mb-4">
        Pick up to two sectors. Leave empty to cover all sectors.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {sectors.map((sec) => {
          const isActive = picked.includes(sec);
          return (
            <button
              key={sec}
              onClick={() => toggle(sec)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {sec}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={start}
          disabled={!canStart}
          className={`px-5 py-2 rounded-lg text-white transition-opacity ${
            canStart ? "bg-primary hover:bg-primary/90" : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Start Questionnaire
        </button>

        <button
          onClick={() => {
            setPicked([]);
            setSelectedSector("All Sectors");
          }}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Use All Sectors
        </button>
      </div>

      {picked.length > 0 && (
        <p className="text-xs text-neutral mt-3">
          Selected: {picked.join(" + ")}
        </p>
      )}
    </div>
  );
}
