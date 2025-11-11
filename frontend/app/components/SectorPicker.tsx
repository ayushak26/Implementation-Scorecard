// app/components/SectorPickerPage.tsx
"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SDGContext } from "./SDGContext";
import Image from "next/image";

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

  // Sector icon mapping
  const getSectorIcon = (sector: string) => {
    const icons: Record<string, string> = {
      'Textiles': '🧵',
      'Fertilizers': '🌾',
      'Packaging': '📦',
    };
    return icons[sector] || '🏭';
  };

  // Sector description mapping
  const getSectorDescription = (sector: string) => {
    const descriptions: Record<string, string> = {
      'Textiles': 'Assess sustainability across fabric production, supply chain, and circular practices',
      'Fertilizers': 'Evaluate environmental impact, resource efficiency, and agricultural sustainability',
      'Packaging': 'Measure circularity, material sustainability, and environmental footprint',
    };
    return descriptions[sector] || 'Comprehensive sustainability assessment for your industry';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 w-full max-w-md">
          <div className="text-center">
            <div className="inline-block relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full opacity-20 animate-pulse"></div>
              </div>
            </div>
            <p className="text-gray-700 font-medium mt-6 text-lg">Loading sectors...</p>
            <p className="text-gray-500 text-sm mt-2">Please wait while we prepare your assessment</p>
          </div>
        </div>
      </div>
    );
  }

  if (availableSectors.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 w-full max-w-md">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Sectors Found</h3>
            <p className="text-gray-600 mb-8">Please upload an Excel file with valid sector data to begin your assessment.</p>
            <button
              onClick={() => router.push("/upload-excel")}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Upload Excel File
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header Section with Logo */}
        <div className="text-center mb-8 sm:mb-12 animate-[fadeIn_0.6s_ease-out]">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative w-48 h-20 sm:w-64 sm:h-24 lg:w-80 lg:h-28">
              <img
                src="https://www.bioradar.org/themes/custom/b5subtheme/logo.svg"
                alt="BIORADAR Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 px-4">
            Implementation Scorecard
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
            Assess your company's sustainability performance and SDG contributions across <span className="font-semibold text-blue-600">Environmental, Economic, Social, and Circular</span> dimensions.
          </p>
        </div>

        {/* Main Card - Responsive Width */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 animate-[fadeIn_0.6s_ease-out] max-w-6xl mx-auto">
          {/* Section Title */}
          <div className="mb-6 sm:mb-8 pb-4 sm:pb-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Select Your Industry Sector
            </h2>
          </div>

          {/* Sector Cards Grid - Auto-sizing based on content */}
          <div className={`grid gap-4 sm:gap-6 mb-6 sm:mb-8 ${
            availableSectors.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
            availableSectors.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {availableSectors.map((sector, index) => {
              const questionCount = questions.filter(q => 
                normalizeSector(q.sector) === sector
              ).length;

              return (
                <button
                  key={sector}
                  onClick={() => handleSectorSelect(sector)}
                  className="group relative bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl sm:rounded-2xl p-5 sm:p-6 hover:border-blue-500 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-left animate-[fadeInUp_0.6s_ease-out_forwards]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Icon */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300">
                      {getSectorIcon(sector)}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {sector}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                    {getSectorDescription(sector)}
                  </p>

                  {/* Hover Gradient Border Effect */}
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"></div>
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Select a sector to begin your assessment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}