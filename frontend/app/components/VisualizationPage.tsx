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
    <div 
      className="w-full flex justify-center min-h-screen"
      style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%)' }}
    >
      <div className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl transition-all duration-300 bg-white rounded-2xl shadow-lg border-2 border-green-200 p-4 sm:p-6 md:p-8 mx-auto my-8">
        
        {/* Header with Logo */}
        <div className="mb-8 pb-6 border-b-2 border-green-100">
          <div className="flex justify-center mb-6">
            <a href="https://www.bioradar.org" target="_blank" rel="noopener noreferrer">
              <img
                src="https://www.bioradar.org/themes/custom/b5subtheme/logo.svg"
                alt="BIORADAR Logo"
                className="h-20 sm:h-24 object-contain"
              />
            </a>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-green-700 mb-2 text-center">
            Sustainability Assessment
          </h1>
          <p className="text-gray-600 text-sm text-center">
            Sector: <span className="font-semibold text-green-700">{currentSector}</span>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-lg p-4 mb-6 animate-shake">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isBusy ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading visualization...</p>
          </div>
        ) : (
          <>
            {/* Visualization with Download Button */}
            {rows.length > 0 ? (
              <div className="mb-6">
                {/* Visualization Component */}
                <div className="border-2 border-green-100 rounded-xl overflow-hidden bg-white shadow-inner">
                  <SdgGridRouletteVisualization rows={rows} sector={currentSector} />
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg font-semibold mb-2">
                  No data available
                </p>
                <p className="text-sm text-gray-600">
                  Please submit the questionnaire again.
                </p>
              </div>
            )}
            
            {/* Bottom Navigation Row */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t-2 border-green-100">
              {/* Left: Back to Sector Selection */}
              <button
                onClick={handleReset}
                className="px-6 py-3 border-2 border-green-300 rounded-lg text-green-700 font-medium transition-all flex items-center gap-2 hover:bg-green-50 hover:border-green-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Sector Selection
              </button>

              {/* Right: View Recommendations */}
              <button
                onClick={() => router.push("/recommendations")}
                disabled={isBusy || !rows || rows.length === 0}
                className={`px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md ${
                  isBusy || !rows || rows.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:from-green-700 hover:to-emerald-700 hover:shadow-lg"
                }`}
              >
                View Recommendations
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}