// app/components/SectorPickerPage.tsx
"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SDGContext } from "./SDGContext";

export default function SectorPickerPage() {
  const context = useContext(SDGContext);
  const router = useRouter();
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  if (!context) return null;

  const { questions, setQuestions, setSelectedSector } = context;

  // Load questions and detect sectors
  useEffect(() => {
    const loadQuestionsAndSectors = async () => {
      setIsLoading(true);
      
      try {
        let loadedQuestions: any[] = [];

        // 1️⃣ First Priority: Check localStorage for uploaded Excel
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("uploadedQuestions");
          
          if (stored) {
            try {
              loadedQuestions = JSON.parse(stored);
              console.log(`✅ Loaded from localStorage: ${loadedQuestions.length} questions`);
            } catch (e) {
              console.warn("Failed to parse localStorage questions:", e);
            }
          }
        }

        // 2️⃣ Fallback: Fetch from API
        if (loadedQuestions.length === 0) {
          console.log("📡 Fetching questions from API...");
          
          const res = await fetch("/api/questionnaire/template", {
            method: "GET",
            cache: "no-store",
          });

          if (res.ok) {
            const data = await res.json();
            loadedQuestions = data.questions || [];
            console.log(`✅ Loaded from API: ${loadedQuestions.length} questions`);
          }
        }

        // Update context with loaded questions
        if (loadedQuestions.length > 0) {
          setQuestions(loadedQuestions);
        }

        // 3️⃣ Extract unique sectors from questions
        const sectorsSet = new Set<string>();
        loadedQuestions.forEach((q: any) => {
          if (q.sector) {
            // Normalize sector names
            const normalized = normalizeSector(q.sector);
            sectorsSet.add(normalized);
          }
        });

        const sectors = Array.from(sectorsSet).sort();
        
        console.log("📊 Available sectors:", sectors);
        console.log("📊 Sample questions:", loadedQuestions.slice(0, 3).map(q => ({
          sector: q.sector,
          question: q.question?.substring(0, 50)
        })));

        setAvailableSectors(sectors);

        // If only one sector, auto-select it
        if (sectors.length === 1) {
          console.log(`✅ Auto-selecting single sector: ${sectors[0]}`);
          setSelectedSector(sectors[0]);
        }

      } catch (error) {
        console.error("Failed to load questions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestionsAndSectors();
  }, [setQuestions, setSelectedSector]);

  // Normalize sector names for consistency
  const normalizeSector = (sector: string): string => {
    if (!sector) return "General";
    
    const normalized = sector.trim();
    
    // Common normalizations
    const sectorMap: Record<string, string> = {
      'textile': 'Textiles',
      'textiles': 'Textiles',
      'fertilizer': 'Fertilizers',
      'fertilizers': 'Fertilizers',
      'packaging': 'Packaging',
    };

    const lower = normalized.toLowerCase();
    return sectorMap[lower] || normalized;
  };

  const handleSectorSelect = (sector: string) => {
    console.log(`🎯 User selected sector: ${sector}`);
    
    // Count questions for this sector
    const sectorQuestions = questions.filter(q => 
      normalizeSector(q.sector) === sector
    );
    
    console.log(`📊 ${sectorQuestions.length} questions available for ${sector}`);
    
    setSelectedSector(sector);
    router.push("/form");
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-neutral">Loading sectors...</p>
        </div>
      </div>
    );
  }

  if (availableSectors.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
        <div className="text-center py-12">
          <p className="text-red-600 font-medium">No sectors found</p>
          <p className="text-sm text-gray-600 mt-2">Please upload an Excel file with valid sector data.</p>
          <button
            onClick={() => router.push("/upload-excel")}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90"
          >
            Upload Excel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-primary">Select Your Sector</h2>
      </div>

      {/* Vertical list of sectors */}
      <div className="space-y-4">
        {availableSectors.map((sector) => {
          return (
            <button
              key={sector}
              onClick={() => handleSectorSelect(sector)}
              className="w-full py-6 px-6 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
            >
              <h3 className="text-2xl font-semibold text-gray-900 group-hover:text-primary transition-colors text-center">
                {sector}
              </h3>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center mt-8">
        <button
          onClick={() => router.push("/upload-excel")}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
        >
          Upload Different Excel
        </button>
      </div>
    </div>
  );
}