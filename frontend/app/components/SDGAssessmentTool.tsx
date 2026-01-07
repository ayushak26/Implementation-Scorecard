"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SDGProvider } from "./SDGContext";
import UploadExcelPage from "./UploadExcelPage";
import FormPage from "./FormPage";
import VisualizationPage from "./VisualizationPage";

export default function SDGAssessmentTool() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const pathname = usePathname();
  let Content = UploadExcelPage;
  if (pathname === "/form") Content = FormPage;
  else if (pathname === "/results") Content = VisualizationPage;

  return (
    <SDGProvider>
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%)' }}>
        {/* Sticky Header */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-md border-b-2 border-green-200 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col items-center gap-3">
              {/* Logo */}
              <div className="flex justify-center">
                <img
                  src="https://www.bioradar.org/themes/custom/b5subtheme/logo.svg"
                  alt="BIORADAR Logo"
                  className="h-16 sm:h-20 object-contain"
                />
              </div>
              
              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-bold text-center text-green-700">
                BIORADAR – Implementation Scorecard
              </h1>
              
              {/* Description */}
              <p className="text-center text-gray-600 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
                Assess your company's sustainability performance and SDG contributions across{" "}
                <span className="font-semibold text-green-700">Environmental, Economic, Social, and Circular</span> dimensions.
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          <Content />
        </main>
      </div>
    </SDGProvider>
  );
}