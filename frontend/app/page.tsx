// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to sector picker
    console.log("📂 Redirecting to sector picker");
    router.push("/sector-picker");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex items-center justify-center">
      <div className="text-center">
        {/* BIORADAR Logo */}
        <div className="mb-8 animate-[fadeIn_0.6s_ease-out]">
          <img
            src="https://www.bioradar.org/themes/custom/b5subtheme/logo.svg"
            alt="BIORADAR Logo"
            className="w-64 h-24 mx-auto object-contain"
          />
        </div>
        
        {/* Loading Spinner */}
        <div className="relative inline-block">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-green-600 rounded-full opacity-20 animate-pulse"></div>
          </div>
        </div>
        
        {/* Loading Text */}
        <p className="mt-6 text-gray-700 font-medium text-lg animate-[fadeIn_0.8s_ease-out]">
          Loading Implementation Scorecard...
        </p>
        <p className="mt-2 text-gray-500 text-sm animate-[fadeIn_1s_ease-out]">
          Preparing your sustainability assessment
        </p>
      </div>
    </div>
  );
}