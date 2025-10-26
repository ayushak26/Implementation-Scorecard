// app/components/VisualizationPage.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SdgGridRouletteVisualization from "./scorecard-viz";

type Question = {
  id: string;
  sdg_number: number;
  sdg_description: string;
  sdg_target: string;
  sustainability_dimension: string;
  kpi: string;
  question: string;
  sector: string;
  score?: number;
};

type SectorData = Record<string, { rows: Question[] }>;

export default function VisualizationPage() {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sector, setSector] = useState<string>("General");
  const [rows, setRows] = useState<Question[]>([]);

  useEffect(() => {
    const loadVisualizationData = async () => {
      setIsBusy(true);
      setError(null);
      try {
        // Primary: sessionStorage
        const raw = typeof window !== "undefined" ? sessionStorage.getItem("scorecard") : null;

        let data: SectorData | null = null;
        if (raw) {
          try {
            data = JSON.parse(raw) as SectorData;
          } catch {
            data = null;
          }
        }

        // Fallback: try temp API (optional)
        if (!data) {
          const r = await fetch("/api/result/latest", { cache: "no-store" });
          if (r.ok) {
            data = (await r.json()) as SectorData;
          }
        }

        if (!data || typeof data !== "object") {
          throw new Error("No visualization data available. Please submit the questionnaire again.");
        }

        const firstSector = Object.keys(data)[0] || "General";
        setSector(firstSector);
        setRows(data[firstSector]?.rows || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load visualization data.");
        setRows([]);
        setSector("General");
      } finally {
        setIsBusy(false);
      }
    };
    loadVisualizationData();
  }, []);

  const handleReset = () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("scorecard");
      }
    } catch {}
    setRows([]);
    setSector("General");
    router.push("/");
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary">SDG Performance Visualization</h2>
        <p className="text-neutral mt-2">
          Explore your sector&apos;s ({sector}) SDG performance metrics and analytics.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 animate-shake">{error}</div>}

      {isBusy ? (
        <div className="text-center text-neutral">Loading visualization...</div>
      ) : (
        <>
          <div className="mb-6">
            <SdgGridRouletteVisualization rows={rows} sector={sector} />
          </div>
        </>
      )}
      <div className="flex justify-end mt-6">
        <button onClick={handleReset} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-800 transition-all duration-300">
          Reset & Start Over
        </button>
      </div>
    </div>
  );
}
