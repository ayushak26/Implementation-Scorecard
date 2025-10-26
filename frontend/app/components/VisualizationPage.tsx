// app/components/VisualizationPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { useRouter } from "next/navigation";
import { SDGContext } from "./SDGContext";
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
  const context = useContext(SDGContext);
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectorData, setSectorData] = useState<SectorData | null>(null);
  const [selectedVizSector, setSelectedVizSector] = useState<string>("");

  if (!context) return null;
  const { sector, selectedSector } = context;

  // Compute available sectors for the dropdown
  const availableSectors = useMemo(() => {
    if (!sectorData) return [];
    return Object.keys(sectorData).filter(s => s && s.trim());
  }, [sectorData]);

  // Initialize selectedVizSector with selectedSector, sector, or first available sector
  useEffect(() => {
    if (selectedSector && availableSectors.includes(selectedSector)) {
      setSelectedVizSector(selectedSector);
    } else if (sector && availableSectors.includes(sector)) {
      setSelectedVizSector(sector);
    } else if (availableSectors.length > 0) {
      setSelectedVizSector(availableSectors[0]);
    } else {
      setSelectedVizSector("General");
    }
  }, [selectedSector, sector, availableSectors]);

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

        // Fallback: try temp API
        if (!data) {
          const r = await fetch("/api/result/latest", { cache: "no-store" });
          if (r.ok) {
            data = (await r.json()) as SectorData;
          }
        }

        if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
          throw new Error("No visualization data available. Please submit the questionnaire again.");
        }

        setSectorData(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load visualization data.");
        setSectorData(null);
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
    context.reset();
    router.push("/");
  };

  const rows = sectorData && selectedVizSector in sectorData ? sectorData[selectedVizSector].rows : [];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary">SDG Performance Visualization</h2>
        <p className="text-neutral mt-2">
          Explore your sector&apos;s ({selectedVizSector}) SDG performance metrics and analytics.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-2">Select Sector</h3>
        <select
          value={selectedVizSector}
          onChange={(e) => setSelectedVizSector(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 w-full max-w-xs"
        >
          {availableSectors.length > 0 ? (
            availableSectors.map(sector => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))
          ) : (
            <option value="General">General</option>
          )}
        </select>
      </div>

      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 animate-shake"
          role="alert"
        >
          {error}
        </div>
      )}

      {isBusy ? (
        <div className="text-center text-neutral">Loading visualization...</div>
      ) : (
        <>
          <div className="mb-6">
            {rows.length > 0 ? (
              <SdgGridRouletteVisualization rows={rows} sector={selectedVizSector} />
            ) : (
              <div className="text-center text-neutral">
                No data available for the selected sector. Please submit the questionnaire again.
              </div>
            )}
          </div>
        </>
      )}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-primary text-white rounded-lg opacity-100"
        >
          Reset & Start Over
        </button>
      </div>
    </div>
  );
}