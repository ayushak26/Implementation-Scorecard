// app/recommendations/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RecommendationsPage from "../components/RecommendationsPage";

export default function RecommendationsRoute() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [sector, setSector] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      setError(null);

      try {
        if (typeof window === "undefined") {
          return;
        }

        // Load scorecard data from sessionStorage
        const scorecardRaw = sessionStorage.getItem("scorecard");
        const sectorRaw = sessionStorage.getItem("scorecardSector");

        if (!scorecardRaw || !sectorRaw) {
          throw new Error("No assessment data found. Please complete the questionnaire first.");
        }

        const sectorData = JSON.parse(scorecardRaw);
        const currentSector = sectorRaw;

        // Extract rows for the current sector
        if (!sectorData[currentSector] || !sectorData[currentSector].rows) {
          throw new Error(`No data available for sector: ${currentSector}`);
        }

        const assessmentRows = sectorData[currentSector].rows;

        console.log(`✅ Loaded ${assessmentRows.length} assessment results for ${currentSector}`);

        setRows(assessmentRows);
        setSector(currentSector);
      } catch (e: any) {
        console.error("Failed to load recommendations data:", e);
        setError(e?.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full flex justify-center bg-gray-50 min-h-screen items-center p-4 sm:p-6 md:p-8">
        <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md w-full">
          <div className="text-center">
            <div className="inline-block relative">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-700 font-medium mt-6 text-lg">Loading recommendations...</p>
            <p className="text-gray-500 text-sm mt-2">Analyzing your assessment results</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !rows || rows.length === 0) {
    return (
      <div className="w-full flex justify-center bg-gray-50 min-h-screen items-center p-4 sm:p-6 md:p-8">
        <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md w-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-8">
              {error || "Please complete the questionnaire to see recommendations."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full px-6 py-3 bg-black text-white font-semibold rounded-lg hover:opacity-90 transition-opacity duration-200"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <RecommendationsPage rows={rows} sector={sector} />;
}