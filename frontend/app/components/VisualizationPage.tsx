// app/components/VisualizationPage.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SdgGridRouletteVisualization from "./scorecard-viz";
import { useContext } from "react";
import { SheetContext } from "./SheetContext";

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
  const { sheetNames, selectedSheet: contextSelectedSheet } = useContext(SheetContext);
  const [activeSheet, setActiveSheet] = useState(contextSelectedSheet || sheetNames[0] || "");

  const normalizeScorecard = (payload: unknown): { sector: string; rows: Question[] } => {
    if (!payload || typeof payload !== "object") {
      return { sector: "General", rows: [] };
    }

    const root =
      "data" in (payload as any) && typeof (payload as any).data === "object"
        ? (payload as any).data
        : (payload as any);

    const entries = Object.entries(root as Record<string, any>);
    if (!entries.length) {
      return { sector: "General", rows: [] };
    }

    const [sectorName, sectorData] = entries[0];
    const sectorRows = Array.isArray(sectorData?.rows) ? sectorData.rows : [];
    return { sector: sectorName, rows: sectorRows };
  };

  useEffect(() => {
    if (!activeSheet && sheetNames.length) {
      setActiveSheet(sheetNames[0]);
      return;
    }
    if (contextSelectedSheet && contextSelectedSheet !== activeSheet) {
      setActiveSheet(contextSelectedSheet);
    }
  }, [sheetNames, activeSheet, contextSelectedSheet]);

  useEffect(() => {
    let isMounted = true;

    const loadVisualizationData = async () => {
      setIsBusy(true);
      setError(null);
      try {
        // Prefer freshly generated data that may be in sessionStorage.
        if (typeof window !== "undefined") {
          const storedData = window.sessionStorage.getItem("scorecard");
          if (storedData) {
            const normalized = normalizeScorecard(JSON.parse(storedData));
            if (!isMounted) return;
            setSector(normalized.sector);
            setRows(normalized.rows);
            return;
          }
        }

  const query = activeSheet ? `?sheet=${encodeURIComponent(activeSheet)}` : "";
        const response = await fetch(`/api/result/latest${query}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load visualization data.");
        }
        const data = await response.json();
        const normalized = normalizeScorecard(data);
        if (!isMounted) return;
        setSector(normalized.sector);
        setRows(normalized.rows);
      } catch (e) {
        if (!isMounted) return;
        setError((e as Error).message || "Failed to load visualization data.");
        setRows([]);
      } finally {
        if (isMounted) {
          setIsBusy(false);
        }
      }
    };

    loadVisualizationData();

    return () => {
      isMounted = false;
    };
  }, [activeSheet, sheetNames]);

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
        <button onClick={handleReset} className="px-4 py-2 bg-primary text-white rounded-lg opacity-100">
          Reset & Start Over
        </button>
      </div>
    </div>
  );
}