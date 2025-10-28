"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SheetSelectionPage = () => {
  const [sheets, setSheets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Fetch sheet names from the backend
    const fetchSheets = async () => {
      try {
        const response = await fetch("/api/sheets"); // Adjust endpoint if needed
        if (!response.ok) {
          throw new Error(`Failed to fetch sheets: ${response.statusText}`);
        }
        const data = await response.json();
        setSheets(data.sheets || []);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    fetchSheets();
  }, []);

  const handleSheetClick = (sheet: string) => {
    router.push(`/questionnaire?sheet=${encodeURIComponent(sheet)}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <h1 className="text-2xl font-bold text-primary">Sheet Selection</h1>
      <p className="text-neutral mt-2">Select a sheet to start the questionnaire.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mt-4" role="alert">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {sheets.map((sheet) => (
          <button
            key={sheet}
            onClick={() => handleSheetClick(sheet)}
            className="w-full px-4 py-2 bg-black text-white rounded-lg shadow-md hover:bg-gray-800"
          >
            {sheet}
          </button>
        ))}
      </div>

      {sheets.length === 0 && !error && (
        <p className="text-gray-600 mt-4">No sheets available. Please upload an Excel file first.</p>
      )}
    </div>
  );
};

export default SheetSelectionPage;