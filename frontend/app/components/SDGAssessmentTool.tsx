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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm rounded-lg p-6 mb-8 z-10">
          <div className="flex items-center justify-center gap-4">
          </div>
          <h1 className="text-3xl font-extrabold text-center text-primary mt-2">
              BIORADAR - Implementation Scorecard
          </h1>
          <p className="text-center text-neutral mt-2 max-w-2xl mx-auto">
              Assess your company's sustainability performance and SDG contributions across Environmental, Economic, Social, and Circular dimensions. Gain insights, identify gaps, and take action to enhance sustainability. Welcome!
          </p>
        </header>
        <main>
          <Content />
        </main>
      </div>
    </SDGProvider>
  );
}