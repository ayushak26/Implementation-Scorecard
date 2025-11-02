// app/components/VisualizationPage.tsx
"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { SDGContext } from "./SDGContext";
import SdgGridRouletteVisualization from "./scorecard-viz";

type Question = {
  sdg_number: number;
  sdg_description: string;
  sustainability_dimension: string;
  question: string;
  sector: string;
  score?: number;
};

type SectorData = Record<string, { rows: Question[] }>;

export default function VisualizationPage() {
  const context = useContext(SDGContext);
  const router = useRouter();

  if (!context) return null;
  const { reset } = context;

  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectorData, setSectorData] = useState<SectorData | null>(null);
  const [currentSector, setCurrentSector] = useState<string>("");
  const [rows, setRows] = useState<Question[]>([]);

  // Load visualization data
  useEffect(() => {
    const loadData = async () => {
      setIsBusy(true);
      setError(null);
      
      try {
        let data: SectorData | null = null;

        // Load from sessionStorage
        if (typeof window !== "undefined") {
          const raw = sessionStorage.getItem("scorecard");
          if (raw) {
            try {
              data = JSON.parse(raw) as SectorData;
            } catch (e) {
              console.error("Failed to parse scorecard:", e);
            }
          }
        }

        if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
          throw new Error("No visualization data available. Please submit the questionnaire again.");
        }

        setSectorData(data);

        // Get first sector and its rows
        const firstSector = Object.keys(data)[0];
        setCurrentSector(firstSector);
        setRows(data[firstSector]?.rows || []);

      } catch (e: any) {
        setError(e?.message || "Failed to load visualization data.");
        setSectorData(null);
      } finally {
        setIsBusy(false);
      }
    };

    loadData();
  }, []);

  const handleReset = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("scorecard");
      sessionStorage.removeItem("scorecardSector");
    }
    reset();
    router.push("/");
  };

  // 📥 CSV Download Function
  const handleDownloadCSV = () => {
    if (!rows || rows.length === 0) {
      alert("No data available to download");
      return;
    }

    try {
      // CSV Headers
      const headers = ["SDG", "Sustainability Dimension", "Question", "Score"];
      
      // Build CSV rows
      const csvRows = rows.map(row => {
        const sdg = row.sdg_number || "";
        const dimension = row.sustainability_dimension || "";
        const question = (row.question || "").replace(/"/g, '""'); // Escape quotes
        const score = row.score !== undefined ? row.score : "";
        
        return [
          `"${sdg}"`,
          `"${dimension}"`,
          `"${question}"`,
          `"${score}"`
        ].join(",");
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...csvRows
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      
      // Filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `SDG_Assessment_${currentSector}_${timestamp}.csv`;
      
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`✅ Downloaded: ${filename}`);
    } catch (error) {
      console.error("CSV download error:", error);
      alert("Failed to download CSV. Please try again.");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6" role="alert">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isBusy ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-neutral">Loading visualization...</p>
        </div>
      ) : (
        <>
          {/* Visualization */}
          <div className="mb-6">
            {rows.length > 0 ? (
              <SdgGridRouletteVisualization rows={rows} sector={currentSector} />
            ) : (
              <div className="text-center text-neutral py-12">
                No data available. Please submit the questionnaire again.
              </div>
            )}
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-6 gap-4">
        {/* Left: Download CSV */}
        <button 
          onClick={handleDownloadCSV}
          disabled={isBusy || !rows || rows.length === 0}
          className={`px-4 py-2 bg-green-600 text-white rounded-lg transition flex items-center gap-2 ${
            isBusy || !rows || rows.length === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-green-700"
          }`}
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          Download CSV
        </button>

        {/* Right: Reset */}
        <button 
          onClick={handleReset} 
          className="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition"
        >
          Back to Sector Selection
        </button>
      </div>
    </div>
  );
}