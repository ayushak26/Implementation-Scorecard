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

function normalizeKey(s: string | undefined | null) {
  return (s ?? "").trim().toLowerCase();
}

export default function VisualizationPage() {
  const context = useContext(SDGContext);
  const router = useRouter();

  if (!context) return null;
  const { sector: ctxSector, selectedSector: ctxSelectedSector, reset } = context;

  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectorData, setSectorData] = useState<SectorData | null>(null);

  // We keep two pieces of selection state:
  // - selectedVizSectorUI: what the <select> shows (original key string)
  // - selectedVizSectorKey: the actual original key used to read rows
  const [selectedVizSectorUI, setSelectedVizSectorUI] = useState<string>("");

  /** Build a lookup from normalized key -> original sector key, plus a stable ordered list of original keys */
  const sectorKeyLookup = useMemo(() => {
    const map = new Map<string, string>();
    const originals: string[] = sectorData ? Object.keys(sectorData) : [];
    for (const k of originals) map.set(normalizeKey(k), k);
    // Sort originals for nicer UI
    originals.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return { map, originals };
  }, [sectorData]);

  /** Resolve any user/context provided sector name to the exact original key in sectorData */
  const resolveToOriginalKey = (name: string | undefined | null): string | null => {
    if (!name) return null;
    const found = sectorKeyLookup.map.get(normalizeKey(name));
    return found ?? null;
  };

  /** Initial load of visualization data (from sessionStorage or fallback API) */
  useEffect(() => {
    const loadVisualizationData = async () => {
      setIsBusy(true);
      setError(null);
      try {
        let data: SectorData | null = null;

        // Primary: sessionStorage
        if (typeof window !== "undefined") {
          const raw = sessionStorage.getItem("scorecard");
          if (raw) {
            try {
              data = JSON.parse(raw) as SectorData;
            } catch {
              data = null;
            }
          }
        }

        // Fallback: temp API
        if (!data) {
          const r = await fetch("/api/result/latest", { cache: "no-store" });
          if (r.ok) data = (await r.json()) as SectorData;
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

  /** Decide the initial selected sector once sectorData + context are available */
  useEffect(() => {
    if (!sectorData) return;

    // Try context.selectedSector (but ignore "All Sectors")
    let initial =
      ctxSelectedSector && normalizeKey(ctxSelectedSector) !== "all sectors"
        ? resolveToOriginalKey(ctxSelectedSector)
        : null;

    // Then try context.sector
    if (!initial) {
      initial = resolveToOriginalKey(ctxSector);
    }

    // Then first available key
    if (!initial) {
      initial = sectorKeyLookup.originals[0] ?? "General";
    }

    setSelectedVizSectorUI(initial);
  }, [sectorData, ctxSelectedSector, ctxSector, sectorKeyLookup.originals]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Derive rows for the currently selected UI value */
  const rows = useMemo(() => {
    if (!sectorData) return [];
    const originalKey =
      resolveToOriginalKey(selectedVizSectorUI) ??
      (sectorKeyLookup.originals.length ? sectorKeyLookup.originals[0] : "");
    if (!originalKey) return [];
    return sectorData[originalKey]?.rows ?? [];
  }, [sectorData, selectedVizSectorUI, sectorKeyLookup.originals]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    try {
      if (typeof window !== "undefined") sessionStorage.removeItem("scorecard");
    } catch {}
    reset();
    router.push("/");
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary">SDG Performance Visualization</h2>
        <p className="text-neutral mt-2">
          Explore your sector&apos;s ({selectedVizSectorUI || "—"}) SDG performance metrics and analytics.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 animate-shake" role="alert">
          {error}
        </div>
      )}

      {isBusy ? (
        <div className="text-center text-neutral">Loading visualization...</div>
      ) : (
        <>
          <div className="mb-6">
            {rows.length > 0 ? (
              <SdgGridRouletteVisualization rows={rows} sector={selectedVizSectorUI} />
            ) : (
              <div className="text-center text-neutral">
                No data available for the selected sector. Please submit the questionnaire again.
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end mt-6">
        <button onClick={handleReset} className="px-4 py-2 bg-black text-white rounded-lg opacity-100">
          Reset & Start Over
        </button>
      </div>
    </div>
  );
}
