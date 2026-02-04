// app/components/Footer.tsx
"use client";

import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-t-2 border-green-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Funding Logos Section */}
        <div className="flex flex-col items-center mb-8">
          {/* CBE-JU Logo - Top Center */}
          <img
            src="/logos/1.png"
            alt="Circular Bio-based Europe Joint Undertaking"
            className="h-20 sm:h-24 w-auto object-contain mb-6"
          />
          
          {/* BIC and EU Logos - Below */}
          <div className="flex flex-wrap justify-center items-center gap-10 sm:gap-20">
            <img
              src="/logos/4.png"
              alt="Bio-based Industries Consortium"
              className="h-12 sm:h-14 w-auto object-contain"
            />
            <img
              src="/logos/2.png"
              alt="Co-funded by the European Union"
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-700">
          {/* Disclaimer */}
          <div className="space-y-2">
            <h4 className="font-semibold text-green-800 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              Disclaimer
            </h4>
            <p className="leading-relaxed text-gray-600">
              The Implementation Scorecard provides a self-assessment and diagnostic overview and does not constitute a certification, verification or compliance assessment.
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="space-y-2">
            <h4 className="font-semibold text-green-800 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              Privacy Notice
            </h4>
            <p className="leading-relaxed text-gray-600">
              The BIORADAR Implementation Scorecard does not store user responses or results. Inputs are processed only during the active session and are not retained. Limited technical data may be processed to ensure the secure operation of the tool, in line with GDPR.
            </p>
          </div>

          {/* Acknowledgement */}
          <div className="space-y-2">
            <h4 className="font-semibold text-green-800 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              Acknowledgement
            </h4>
            <p className="leading-relaxed text-gray-600">
              This tool was developed as part of the BIORADAR project. The project is supported by the Circular Bio-based Europe Joint Undertaking and its members. Funded by the European Union. Views and opinions expressed are however those of the author(s) only and do not necessarily reflect those of the European Union or CBE JU. Neither the European Union nor the CBE JU can be held responsible for them.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-green-200 flex justify-center items-center">
          <p className="text-xs text-green-700 font-medium">
            © {new Date().getFullYear()} BIORADAR Project. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}