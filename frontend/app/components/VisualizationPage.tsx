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

type DimensionScore = {
  dimension: string;
  averageScore: number;
  questionCount: number;
};

type SDGScore = {
  sdgNumber: number;
  sdgDescription: string;
  averageScore: number;
  questionCount: number;
};

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
  const [dimensionScores, setDimensionScores] = useState<DimensionScore[]>([]);
  const [topSDGs, setTopSDGs] = useState<SDGScore[]>([]);
  const [bottomSDGs, setBottomSDGs] = useState<SDGScore[]>([]);

  // Calculate dimension and SDG performance
  const calculatePerformance = (questions: Question[]) => {
    // Calculate dimension scores
    const dimensionMap = new Map<string, { total: number; count: number }>();
    questions.forEach((q) => {
      if (q.score !== undefined) {
        const existing = dimensionMap.get(q.sustainability_dimension) || { total: 0, count: 0 };
        dimensionMap.set(q.sustainability_dimension, {
          total: existing.total + q.score,
          count: existing.count + 1,
        });
      }
    });

    const dimensions: DimensionScore[] = Array.from(dimensionMap.entries()).map(
      ([dimension, data]) => ({
        dimension,
        averageScore: data.total / data.count,
        questionCount: data.count,
      })
    );

    // Calculate SDG scores
    const sdgMap = new Map<number, { description: string; total: number; count: number }>();
    questions.forEach((q) => {
      if (q.score !== undefined) {
        const existing = sdgMap.get(q.sdg_number) || {
          description: q.sdg_description,
          total: 0,
          count: 0,
        };
        sdgMap.set(q.sdg_number, {
          description: q.sdg_description,
          total: existing.total + q.score,
          count: existing.count + 1,
        });
      }
    });

    const sdgs: SDGScore[] = Array.from(sdgMap.entries()).map(([sdgNumber, data]) => ({
      sdgNumber,
      sdgDescription: data.description,
      averageScore: data.total / data.count,
      questionCount: data.count,
    }));

    // Sort and get top/bottom 2
    const sortedSDGs = [...sdgs].sort((a, b) => b.averageScore - a.averageScore);
    const top2 = sortedSDGs.slice(0, 2);
    const bottom2 = sortedSDGs.slice(-2).reverse();

    setDimensionScores(dimensions.sort((a, b) => b.averageScore - a.averageScore));
    setTopSDGs(top2);
    setBottomSDGs(bottom2);
  };

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
        const sectorRows = data[firstSector]?.rows || [];
        setRows(sectorRows);

        // Calculate performance metrics
        calculatePerformance(sectorRows);

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

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600 bg-green-50";
    if (score >= 3) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 4) return "bg-green-600";
    if (score >= 3) return "bg-yellow-600";
    return "bg-red-600";
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      {/* Header with Logo */}
      <div className="mb-8">
        <div className="flex justify-center mb-6">
          <a href="https://www.bioradar.org" target="_blank" rel="noopener noreferrer">
            <img
              src="https://www.bioradar.org/themes/custom/b5subtheme/logo.svg"
              alt="BIORADAR Logo"
              className="h-20 sm:h-24 object-contain"
            />
          </a>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 text-center">
          Sustainability Assessment
        </h1>
        <p className="text-gray-600 text-center">
          Sector: <span className="font-semibold">{currentSector}</span>
        </p>
      </div>

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
          {/* Visualization with Download Button */}
          {rows.length > 0 ? (
            <div className="mb-6">
              {/* Visualization Component */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <SdgGridRouletteVisualization rows={rows} sector={currentSector} />
              </div>
            </div>
          ) : (
            <div className="text-center text-neutral py-12">
              No data available. Please submit the questionnaire again.
            </div>
          )}
          {/* Bottom Navigation Row */}
          <div className="flex justify-between items-center gap-4 mt-6">
            {/* Left: Back to Sector Selection */}
            <button
              onClick={handleReset}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Back to Sector Selection
            </button>

            {/* Right: View Recommendations */}
            <button
              onClick={() => router.push("/recommendations")}
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              View Recommendations
            </button>
          </div>
        </>
      )}
    </div>
  );
}